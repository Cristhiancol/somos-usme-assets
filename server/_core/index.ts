import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { syncFromGoogleDrive } from "../gdrive-sync";
import { getLastSync, getRunningSync } from "../db";
import { getGDriveAuthUrl, exchangeCodeForTokens, isGDriveAuthorized, parseGDriveState } from "../gdrive-oauth";
import { initSentryServer, captureException } from "./sentry";
import { registerStorageProxy } from "./storageProxy";
import cron from "node-cron";
import { sendStockCeroReport } from "../email-service";
import { serverLogger } from "../logger";
import { notificarStockCero, notificarOrdenCreada, notificarOrdenAprobada, notificarSincronizacion, isZapierConfigured } from "../zapier";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Initialize Sentry for error tracking
  initSentryServer();

  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Storage proxy for /manus-storage/* assets
  registerStorageProxy(app);
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Google Drive OAuth callback — receives code from Google and exchanges for tokens
  app.get('/api/gdrive/callback', async (req, res) => {
    const { code, state, error } = req.query as Record<string, string>;
    if (error) {
      serverLogger.error('[GDriveOAuth] Callback error:', error);
      return res.redirect('/sync?gdrive_error=' + encodeURIComponent(error));
    }
    if (!code || !state) {
      return res.redirect('/sync?gdrive_error=invalid_callback');
    }
    // Recover the exact redirectUri from the state payload (base64url-encoded JSON)
    // This avoids relying on req.headers.origin which is absent in Google redirects
    const parsed = parseGDriveState(state);
    let redirectUri: string;
    if (parsed && parsed.redirectUri) {
      redirectUri = parsed.redirectUri;
      serverLogger.log('[GDriveOAuth] Recovered redirectUri from state:', redirectUri);
    } else {
      // Fallback: construct from host header
      const host = req.headers.host || 'usme.blog';
      const proto = host.includes('localhost') ? 'http' : 'https';
      redirectUri = `${proto}://${host}/api/gdrive/callback`;
      serverLogger.warn('[GDriveOAuth] Could not parse state, using fallback redirectUri:', redirectUri);
    }
    const success = await exchangeCodeForTokens(code, redirectUri);
    if (success) {
      serverLogger.log('[GDriveOAuth] Authorization successful!');
      return res.redirect('/sync?gdrive_success=1');
    } else {
      return res.redirect('/sync?gdrive_error=token_exchange_failed');
    }
  });

  // Get Google Drive auth URL
  // The frontend passes its own origin so the redirect_uri matches exactly what's registered in Google Cloud
  app.get('/api/gdrive/auth-url', (req, res) => {
    // Accept origin from query param (passed by frontend) or fallback to request headers
    const frontendOrigin = (req.query.origin as string) || req.headers.origin || `${req.protocol}://${req.headers.host}`;
    const redirectUri = `${frontendOrigin}/api/gdrive/callback`;
    serverLogger.log('[GDriveOAuth] Building auth URL with redirectUri:', redirectUri);
    const url = getGDriveAuthUrl(redirectUri);
    res.json({ url, redirectUri });
  });

  // Check Google Drive authorization status
  app.get('/api/gdrive/status', async (_req, res) => {
    const authorized = await isGDriveAuthorized();
    res.json({ authorized });
  });

  // Google Drive sync endpoint — síncrono directo
  // La sync tarda ~10s, bien dentro del timeout de 180s de Cloud Run
  // No fire-and-forget: responde con el resultado completo
  app.post('/api/sync-drive', async (_req, res) => {
    try {
      const result = await syncFromGoogleDrive();
      serverLogger.log('[Sync] Sync completed:', result.message);
      return res.json({
        success: result.success,
        message: result.message,
        stats: result.stats,
      });
    } catch (error: any) {
      serverLogger.error('[Sync] Sync failed:', error.message);
      captureException(error, { context: 'SyncDrive' });
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Sync status endpoint — devuelve la última sync completada
  app.get('/api/sync-status', async (_req, res) => {
    try {
      const last = await getLastSync();
      if (!last) {
        return res.json({ inProgress: false, lastResult: null });
      }
      const lastResult = {
        success: last.status === 'success',
        message: last.status === 'success'
          ? `Sincronización exitosa: ${last.itemsProcessed || 0} referencias, ${last.ordersProcessed || 0} órdenes, ${last.suppliersProcessed || 0} proveedores`
          : (last.errorMessage || 'Error en sincronización'),
        completedAt: last.completedAt?.toISOString() ?? last.startedAt.toISOString(),
        startedAt: last.startedAt?.toISOString(),
      };
      return res.json({ inProgress: false, lastResult });
    } catch (err: any) {
      serverLogger.error('[SyncStatus] Error:', err.message);
      return res.status(500).json({ inProgress: false, lastResult: null, error: err.message });
    }
  });

  // 🔴 TEMPORARY ENDPOINT TO FIX TIDB INCONSISTENT STATE
  app.post('/api/fix-tidb', async (_req, res) => {
    try {
      const { getDb } = await import('../db');
      const { sql } = await import('drizzle-orm');
      const db = await getDb();
      if (!db) throw new Error('No DB connection');
      
      serverLogger.log('[FixTiDB] Executing TRUNCATE...');
      await db.execute(sql`TRUNCATE TABLE consumo_mensual;`);
      
      serverLogger.log('[FixTiDB] Executing ALTER TABLE...');
      await db.execute(sql`ALTER TABLE consumo_mensual ADD UNIQUE INDEX IF NOT EXISTS idx_ref_mes_unique (referencia, mes);`);
      
      serverLogger.log('[FixTiDB] Fix completed.');
      res.json({ success: true, message: 'TRUNCATE and ALTER completed safely.' });
    } catch (error: any) {
      serverLogger.error('[FixTiDB] Error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Auto-sync every 15 minutes
  setInterval(async () => {
    serverLogger.log('[AutoSync] Running scheduled Google Drive sync...');
    try {
      await syncFromGoogleDrive();
    } catch (e) {
      serverLogger.error('[AutoSync] Failed:', e);
      captureException(e, { context: 'AutoSync' });
    }
  }, 15 * 60 * 1000);

  // ── Cron Job: Reporte diario Stock Cero OC — 7:00 AM Colombia (UTC-5 = 12:00 UTC) ──
  // Expresión cron: 0 12 * * * (seg min hora día mes díaSemana)
  cron.schedule('0 12 * * *', async () => {
    serverLogger.log('[CronJob] Enviando reporte diario Stock Cero OC...');
    try {
      const result = await sendStockCeroReport();
      serverLogger.log('[CronJob] Reporte enviado:', result.message);
    } catch (e: any) {
      serverLogger.error('[CronJob] Error enviando reporte:', e.message);
      captureException(e, { context: 'CronJob-StockCeroReport' });
    }
  }, {
    timezone: 'America/Bogota',
  });
  serverLogger.log('[CronJob] Reporte diario Stock Cero OC programado: 7:00 AM hora Colombia');

  // Endpoint REST para disparar el reporte manualmente (usado por cron externo o admin)
  app.post('/api/cron/stock-cero-report', async (req, res) => {
    const apiKey = req.headers['x-cron-key'];
    const expectedKey = process.env.CRON_SECRET_KEY;
    // Si hay clave configurada, validarla; si no, solo permitir desde localhost
    if (expectedKey && apiKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const result = await sendStockCeroReport({ to: req.body?.to });
      return res.json(result);
    } catch (e: any) {
      serverLogger.error('[CronEndpoint] Error:', e.message);
      return res.status(500).json({ success: false, message: e.message });
    }
  });
  // ── Webhooks internos para Zapier → WhatsApp ──
  // Autenticación por x-internal-token (solo llamadas internas del sistema)
  const INTERNAL_TOKEN = process.env.INTERNAL_API_TOKEN ?? "";

  function validateInternalToken(req: express.Request, res: express.Response): boolean {
    if (!INTERNAL_TOKEN) {
      res.status(503).json({ error: "INTERNAL_API_TOKEN no configurado" });
      return false;
    }
    if (req.headers["x-internal-token"] !== INTERNAL_TOKEN) {
      res.status(401).json({ error: "No autorizado" });
      return false;
    }
    return true;
  }

  // Webhook #1 — Stock Cero
  app.post("/api/webhooks/stock-cero", (req, res) => {
    if (!validateInternalToken(req, res)) return;
    const { referencia, descripcion, categoria, proveedor, costoUnitario, parteFabricante } = req.body;
    notificarStockCero({ referencia, descripcion, categoria, proveedor, costoUnitario, parteFabricante });
    res.json({ ok: true });
  });

  // Webhook #2 — Nueva Orden de Compra
  app.post("/api/webhooks/orden-creada", (req, res) => {
    if (!validateInternalToken(req, res)) return;
    notificarOrdenCreada(req.body);
    res.json({ ok: true });
  });

  // Webhook #3 — Orden de Compra Aprobada
  app.post("/api/webhooks/orden-aprobada", (req, res) => {
    if (!validateInternalToken(req, res)) return;
    notificarOrdenAprobada(req.body);
    res.json({ ok: true });
  });

  // Webhook #4 — Sincronización Completada
  app.post("/api/webhooks/sincronizacion", (req, res) => {
    if (!validateInternalToken(req, res)) return;
    notificarSincronizacion(req.body);
    res.json({ ok: true });
  });

  // Estado de Zapier (para verificar configuración desde el dashboard)
  app.get("/api/zapier/status", (_req, res) => {
    res.json({ configured: isZapierConfigured() });
  });

  serverLogger.log(`[Zapier] Webhooks internos registrados (configurado: ${isZapierConfigured()})`);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  const isProduction = process.env.NODE_ENV === "production" || import.meta.dirname.endsWith("dist") || import.meta.dirname.endsWith("dist/");
  
  if (!isProduction) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    serverLogger.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    serverLogger.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch((e) => serverLogger.error('[Server] Fatal startup error:', e));
