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
import { getGDriveAuthUrl, exchangeCodeForTokens, isGDriveAuthorized, parseGDriveState } from "../gdrive-oauth";
import { initSentryServer, captureException } from "./sentry";
import { registerStorageProxy } from "./storageProxy";
import cron from "node-cron";
import { sendStockCeroReport } from "../email-service";

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
      console.error('[GDriveOAuth] Callback error:', error);
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
      console.log('[GDriveOAuth] Recovered redirectUri from state:', redirectUri);
    } else {
      // Fallback: construct from host header
      const host = req.headers.host || 'usme.blog';
      const proto = host.includes('localhost') ? 'http' : 'https';
      redirectUri = `${proto}://${host}/api/gdrive/callback`;
      console.warn('[GDriveOAuth] Could not parse state, using fallback redirectUri:', redirectUri);
    }
    const success = await exchangeCodeForTokens(code, redirectUri);
    if (success) {
      console.log('[GDriveOAuth] Authorization successful!');
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
    console.log('[GDriveOAuth] Building auth URL with redirectUri:', redirectUri);
    const url = getGDriveAuthUrl(redirectUri);
    res.json({ url, redirectUri });
  });

  // Check Google Drive authorization status
  app.get('/api/gdrive/status', async (_req, res) => {
    const authorized = await isGDriveAuthorized();
    res.json({ authorized });
  });

  // Google Drive sync endpoint
  app.post('/api/sync-drive', async (_req, res) => {
    try {
      const result = await syncFromGoogleDrive();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Auto-sync every 15 minutes
  setInterval(async () => {
    console.log('[AutoSync] Running scheduled Google Drive sync...');
    try {
      await syncFromGoogleDrive();
    } catch (e) {
      console.error('[AutoSync] Failed:', e);
      captureException(e, { context: 'AutoSync' });
    }
  }, 15 * 60 * 1000);

  // ── Cron Job: Reporte diario Stock Cero OC — 7:00 AM Colombia (UTC-5 = 12:00 UTC) ──
  // Expresión cron: 0 12 * * * (seg min hora día mes díaSemana)
  cron.schedule('0 12 * * *', async () => {
    console.log('[CronJob] Enviando reporte diario Stock Cero OC...');
    try {
      const result = await sendStockCeroReport();
      console.log('[CronJob] Reporte enviado:', result.message);
    } catch (e: any) {
      console.error('[CronJob] Error enviando reporte:', e.message);
      captureException(e, { context: 'CronJob-StockCeroReport' });
    }
  }, {
    timezone: 'America/Bogota',
  });
  console.log('[CronJob] Reporte diario Stock Cero OC programado: 7:00 AM hora Colombia');

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
      console.error('[CronEndpoint] Error:', e.message);
      return res.status(500).json({ success: false, message: e.message });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
