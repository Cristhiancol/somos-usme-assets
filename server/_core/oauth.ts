import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { registrarAuditoria } from "../auditoria";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";
import { serverLogger } from "../logger";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/** Extraer IP real del request (detrás de proxy) */
function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

/** Extraer User-Agent del request */
function getUserAgent(req: Request): string {
  return (req.headers["user-agent"] ?? "unknown").substring(0, 500);
}

/**
 * Parsear el state para extraer la URL de redirección original.
 * El state viene como base64(JSON({ redirectUri })) desde el frontend.
 */
function parseRedirectFromState(state: string): string {
  try {
    const decoded = Buffer.from(state, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    // El redirectUri contiene la URL base del frontend
    if (parsed.redirectUri) {
      const url = new URL(parsed.redirectUri);
      return url.origin;
    }
  } catch {
    // Fallback
  }
  return "";
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);
    const frontendOrigin = parseRedirectFromState(state);

    try {
      // 1. Intercambiar código por token y obtener info del usuario
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      const email = userInfo.email ?? "sin-email";
      const openId = userInfo.openId;

      // 2. ═══ VALIDACIÓN DE WHITELIST ═══
      // Verificar si el usuario ya existe en la BD
      const existingUser = await db.getUserByOpenId(openId);

      // Si el usuario NO existe y NO es el owner → BLOQUEAR
      if (!existingUser && openId !== ENV.ownerOpenId) {
        // Verificar también por email
        const userByEmail = await db.getUserByEmail(email);

        if (!userByEmail) {
          // ❌ Usuario NO autorizado — NO crear sesión, NO crear cookie
          await registrarAuditoria("LOGIN_RECHAZADO", email, "Correo no registrado en BD", {
            openId,
            ip: clientIp,
            userAgent,
          });

          serverLogger.warn(`[OAuth] BLOQUEADO: ${email} (${openId}) — no registrado en BD`);

          // Redirigir al frontend con error
          const redirectUrl = frontendOrigin
            ? `${frontendOrigin}/?error=NoAutorizado`
            : "/?error=NoAutorizado";
          res.redirect(302, redirectUrl);
          return;
        }

        // Existe por email pero con otro openId → actualizar openId
        // (caso: usuario cambió de proveedor OAuth)
      }

      // 3. Verificar si el usuario está ACTIVO
      if (existingUser && existingUser.activo === 0) {
        await registrarAuditoria("LOGIN_RECHAZADO", email, "Usuario inactivo (activo=0)", {
          openId,
          ip: clientIp,
          userAgent,
        });

        serverLogger.warn(`[OAuth] BLOQUEADO: ${email} — usuario inactivo`);

        const redirectUrl = frontendOrigin
          ? `${frontendOrigin}/?error=UsuarioInactivo`
          : "/?error=UsuarioInactivo";
        res.redirect(302, redirectUrl);
        return;
      }

      // 4. ✅ Usuario autorizado — upsert y crear sesión
      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { 
        ...cookieOptions, 
        maxAge: 30 * 24 * 60 * 60 * 1000, 
        sameSite: "lax" 
      });

      // Registrar login exitoso
      await registrarAuditoria("LOGIN_EXITOSO", email, "Acceso concedido", {
        openId,
        ip: clientIp,
        userAgent,
      });

      res.redirect(302, "/");
    } catch (error) {
      serverLogger.error("[OAuth] Callback failed", error);

      // Registrar error de servidor
      await registrarAuditoria("LOGIN_RECHAZADO", "unknown", `Error de servidor: ${String(error)}`, {
        ip: clientIp,
        userAgent,
      }).catch(() => {});

      const redirectUrl = frontendOrigin
        ? `${frontendOrigin}/?error=ErrorServidor`
        : "/?error=ErrorServidor";
      res.redirect(302, redirectUrl);
    }
  });
}
