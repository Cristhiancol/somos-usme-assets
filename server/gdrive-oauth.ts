/**
 * Google Drive OAuth 2.0 helper
 * Uses the client credentials created by Horus in Google Cloud Console.
 * Stores refresh_token in the database so it persists across deployments.
 */
import { getDb } from "./db";
import { oauthTokens } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { serverLogger } from "./logger";

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || process.env.GDRIVE_CLIENT_ID || "220183698829-7o71jvu74scbc1rp0kfimcf6sl2l7qro.apps.googleusercontent.com";
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || process.env.GDRIVE_CLIENT_SECRET || "";
const PROVIDER = "google_drive";

/**
 * Build the Google OAuth authorization URL.
 * The user visits this URL once to grant access.
 */
export function getGDriveAuthUrl(redirectUri: string): string {
  // Encode the redirectUri in the state so the callback can recover it exactly
  const statePayload = Buffer.from(JSON.stringify({ type: 'gdrive_auth', redirectUri })).toString('base64url');
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly",
    access_type: "offline",
    prompt: "consent",
    state: statePayload,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Parse the state param from the OAuth callback.
 * Returns { type, redirectUri } or null if invalid.
 */
export function parseGDriveState(state: string): { type: string; redirectUri: string } | null {
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    if (decoded.type && decoded.redirectUri) return decoded;
    return null;
  } catch {
    // Legacy plain-text state fallback
    if (state === 'gdrive_auth') return null;
    return null;
  }
}

/**
 * Exchange authorization code for access + refresh tokens.
 * Saves them to the database.
 */
export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<boolean> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      serverLogger.error("[GDriveOAuth] Token exchange failed:", err);
      return false;
    }

    const data = await res.json();
    serverLogger.log("[GDriveOAuth] Token exchange success. Has refresh_token:", !!data.refresh_token);

    const expiresAt = data.expires_in ? Date.now() + data.expires_in * 1000 : null;
    const database = await getDb();
    if (!database) return false;

    // Upsert token in database
    const existing = await database.select().from(oauthTokens).where(eq(oauthTokens.provider, PROVIDER)).limit(1);
    if (existing.length > 0) {
      await database.update(oauthTokens)
        .set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token || existing[0].refreshToken,
          expiresAt: expiresAt ?? undefined,
        })
        .where(eq(oauthTokens.provider, PROVIDER));
    } else {
      await database.insert(oauthTokens).values({
        provider: PROVIDER,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: expiresAt ?? undefined,
      });
    }

    return true;
  } catch (e) {
    serverLogger.error("[GDriveOAuth] Error exchanging code:", e);
    return false;
  }
}

/**
 * Get a valid access token, refreshing if needed.
 * Returns null if no token is stored.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const database = await getDb();
  if (!database) return null;

  const rows = await database.select().from(oauthTokens).where(eq(oauthTokens.provider, PROVIDER)).limit(1);
  if (rows.length === 0) return null;

  const token = rows[0];
  if (!token.refreshToken) return null;

  // Check if access token is still valid (with 5 min buffer)
  const isExpired = !token.expiresAt || Date.now() >= token.expiresAt - 5 * 60 * 1000;

  if (!isExpired && token.accessToken) {
    return token.accessToken;
  }

  // Refresh the access token
  serverLogger.log("[GDriveOAuth] Access token expired, refreshing...");
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: token.refreshToken,
        grant_type: "refresh_token",
      }).toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      serverLogger.error("[GDriveOAuth] Token refresh failed:", err);
      return null;
    }

    const data = await res.json();
    const newExpiresAt = data.expires_in ? Date.now() + data.expires_in * 1000 : null;

    await database.update(oauthTokens)
      .set({
        accessToken: data.access_token,
        expiresAt: newExpiresAt ?? undefined,
      })
      .where(eq(oauthTokens.provider, PROVIDER));

    serverLogger.log("[GDriveOAuth] Token refreshed successfully.");
    return data.access_token;
  } catch (e) {
    serverLogger.error("[GDriveOAuth] Error refreshing token:", e);
    return null;
  }
}

/**
 * Check if Google Drive is authorized (has a stored refresh_token).
 */
export async function isGDriveAuthorized(): Promise<boolean> {
  const database = await getDb();
  if (!database) return false;
  const rows = await database.select().from(oauthTokens).where(eq(oauthTokens.provider, PROVIDER)).limit(1);
  return rows.length > 0 && !!rows[0].refreshToken;
}
