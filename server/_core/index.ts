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
import { getGDriveAuthUrl, exchangeCodeForTokens, isGDriveAuthorized } from "../gdrive-oauth";

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
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Google Drive OAuth callback — receives code from Google and exchanges for tokens
  app.get('/api/gdrive/callback', async (req, res) => {
    const { code, state, error } = req.query as Record<string, string>;
    if (error) {
      console.error('[GDriveOAuth] Callback error:', error);
      return res.redirect('/?gdrive_error=' + encodeURIComponent(error));
    }
    if (!code || state !== 'gdrive_auth') {
      return res.redirect('/?gdrive_error=invalid_callback');
    }
    const origin = req.headers.origin || `${req.protocol}://${req.headers.host}`;
    const redirectUri = `${origin}/api/gdrive/callback`;
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
    }
  }, 15 * 60 * 1000);
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
