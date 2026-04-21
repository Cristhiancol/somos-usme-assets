/**
 * Auditoría de Accesos — Somos Bogotá Usme
 * Registra todos los eventos de autenticación en la tabla auditoria_accesos.
 */
import { getDb } from "./db";
import { auditoriaAccesos, InsertAuditoriaAcceso } from "../drizzle/schema";
import { serverLogger } from "./logger";

export type EventoAuditoria =
  | "LOGIN_EXITOSO"
  | "LOGIN_RECHAZADO"
  | "LOGOUT"
  | "ACCESO_DENEGADO";

export async function registrarAuditoria(
  evento: EventoAuditoria,
  email: string,
  detalle?: string,
  extra?: { openId?: string; ip?: string; userAgent?: string }
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      serverLogger.warn("[Auditoria] BD no disponible, evento no registrado:", evento, email);
      return;
    }

    const record: InsertAuditoriaAcceso = {
      evento,
      email,
      detalle: detalle ?? null,
      openId: extra?.openId ?? null,
      ip: extra?.ip ?? null,
      userAgent: extra?.userAgent ? extra.userAgent.substring(0, 500) : null,
    };

    await db.insert(auditoriaAccesos).values(record);
    serverLogger.log(`[Auditoria] ${evento} — ${email} — ${detalle ?? "OK"}`);
  } catch (error) {
    // No frenar el flujo de autenticación por un error de auditoría
    serverLogger.error("[Auditoria] Error registrando evento:", error);
  }
}
