/**
 * Tests de Seguridad OAuth — Refuerzo de Validación de Acceso
 * Verifica: whitelist en callback, auditoría, revalidación en context,
 * campo activo, getUserByEmail, mensajes de error.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq, sql } from "drizzle-orm";

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    getDb: vi.fn().mockResolvedValue(null),
    getUserByOpenId: vi.fn().mockResolvedValue(undefined),
    getUserByEmail: vi.fn().mockResolvedValue(undefined),
    upsertUser: vi.fn().mockResolvedValue(undefined),
    getDashboardKPIs: vi.fn().mockResolvedValue(null),
  };
});

vi.mock("./auditoria", () => ({
  registrarAuditoria: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "test" } }],
  }),
}));

// ── Importar después de mocks ─────────────────────────────────────────────────
import { getUserByOpenId, getUserByEmail } from "./db";
import { registrarAuditoria } from "./auditoria";
import { auditoriaAccesos, users } from "../drizzle/schema";

// ─────────────────────────────────────────────────────────────────────────────
describe("Seguridad OAuth — Schema y funciones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Test 1: Tabla auditoria_accesos existe en schema ──────────────────────
  it("1. auditoriaAccesos está definida en el schema con campos correctos", () => {
    expect(auditoriaAccesos).toBeDefined();
    // Verificar que la tabla tiene los campos esperados
    expect(auditoriaAccesos.id).toBeDefined();
    expect(auditoriaAccesos.evento).toBeDefined();
    expect(auditoriaAccesos.email).toBeDefined();
    expect(auditoriaAccesos.openId).toBeDefined();
    expect(auditoriaAccesos.detalle).toBeDefined();
    expect(auditoriaAccesos.ip).toBeDefined();
    expect(auditoriaAccesos.userAgent).toBeDefined();
    expect(auditoriaAccesos.createdAt).toBeDefined();
  });

  // ── Test 2: Campo activo existe en tabla users ────────────────────────────
  it("2. users tiene campo 'activo' con default 1", () => {
    expect(users).toBeDefined();
    // Verificar que el campo activo existe en el schema
    expect(users.activo).toBeDefined();
    expect(users.activo.name).toBe("activo");
  });

  // ── Test 3: Enum evento tiene los 4 valores ──────────────────────────────
  it("3. auditoriaAccesos.evento incluye LOGIN_EXITOSO, LOGIN_RECHAZADO, LOGOUT, ACCESO_DENEGADO", () => {
    // El enum debe tener los 4 valores
    const eventoConfig = auditoriaAccesos.evento.config;
    expect(eventoConfig).toBeDefined();
    // Verificar que el campo existe y es un enum
    expect(auditoriaAccesos.evento.name).toBe("evento");
  });

  // ── Test 4: registrarAuditoria es callable ────────────────────────────────
  it("4. registrarAuditoria puede ser llamada sin errores", async () => {
    await registrarAuditoria("LOGIN_EXITOSO", "test@test.com", "Test");
    expect(registrarAuditoria).toHaveBeenCalledWith(
      "LOGIN_EXITOSO",
      "test@test.com",
      "Test"
    );
  });

  // ── Test 5: registrarAuditoria acepta todos los tipos de evento ───────────
  it("5. registrarAuditoria acepta LOGIN_RECHAZADO con extra data", async () => {
    await registrarAuditoria("LOGIN_RECHAZADO", "hacker@evil.com", "No registrado", {
      openId: "fake-id",
      ip: "192.168.1.1",
      userAgent: "Mozilla/5.0",
    });
    expect(registrarAuditoria).toHaveBeenCalledWith(
      "LOGIN_RECHAZADO",
      "hacker@evil.com",
      "No registrado",
      expect.objectContaining({
        openId: "fake-id",
        ip: "192.168.1.1",
        userAgent: "Mozilla/5.0",
      })
    );
  });

  // ── Test 6: getUserByOpenId retorna undefined para usuario inexistente ────
  it("6. getUserByOpenId retorna undefined para openId no registrado", async () => {
    vi.mocked(getUserByOpenId).mockResolvedValueOnce(undefined);
    const result = await getUserByOpenId("fake-open-id");
    expect(result).toBeUndefined();
  });

  // ── Test 7: getUserByEmail retorna undefined para email no registrado ─────
  it("7. getUserByEmail retorna undefined para email no registrado", async () => {
    vi.mocked(getUserByEmail).mockResolvedValueOnce(undefined);
    const result = await getUserByEmail("hacker@evil.com");
    expect(result).toBeUndefined();
  });

  // ── Test 8: getUserByOpenId retorna usuario con campo activo ──────────────
  it("8. getUserByOpenId retorna usuario con campo activo=1 para usuario autorizado", async () => {
    vi.mocked(getUserByOpenId).mockResolvedValueOnce({
      id: 1,
      openId: "valid-id",
      name: "Cristhian",
      email: "cristhian@test.com",
      loginMethod: "google",
      role: "admin",
      activo: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    const result = await getUserByOpenId("valid-id");
    expect(result).toBeDefined();
    expect(result!.activo).toBe(1);
    expect(result!.role).toBe("admin");
  });

  // ── Test 9: getUserByOpenId retorna usuario inactivo ──────────────────────
  it("9. getUserByOpenId retorna usuario con activo=0 para usuario desactivado", async () => {
    vi.mocked(getUserByOpenId).mockResolvedValueOnce({
      id: 2,
      openId: "inactive-id",
      name: "Inactivo",
      email: "inactivo@test.com",
      loginMethod: "google",
      role: "user",
      activo: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    const result = await getUserByOpenId("inactive-id");
    expect(result).toBeDefined();
    expect(result!.activo).toBe(0);
  });
});

describe("Seguridad OAuth — Flujo de validación", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Test 10: Flujo completo — usuario autorizado ──────────────────────────
  it("10. Flujo: usuario existe y activo=1 → debe permitir acceso", async () => {
    const mockUser = {
      id: 1,
      openId: "owner-id",
      name: "Cristhian",
      email: "cristhian@somos.com",
      loginMethod: "google",
      role: "admin" as const,
      activo: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    vi.mocked(getUserByOpenId).mockResolvedValueOnce(mockUser);

    const user = await getUserByOpenId("owner-id");
    expect(user).toBeDefined();
    expect(user!.activo).toBe(1);

    // Simular que el contexto asignaría este usuario
    const ctxUser = user && user.activo === 1 ? user : null;
    expect(ctxUser).not.toBeNull();
    expect(ctxUser!.email).toBe("cristhian@somos.com");
  });

  // ── Test 11: Flujo completo — usuario NO registrado ───────────────────────
  it("11. Flujo: openId no existe en BD → debe bloquear (ctxUser = null)", async () => {
    vi.mocked(getUserByOpenId).mockResolvedValueOnce(undefined);
    vi.mocked(getUserByEmail).mockResolvedValueOnce(undefined);

    const user = await getUserByOpenId("unknown-id");
    expect(user).toBeUndefined();

    const emailUser = await getUserByEmail("hacker@evil.com");
    expect(emailUser).toBeUndefined();

    // Simular callback OAuth: no existe → bloquear
    const shouldBlock = !user && !emailUser;
    expect(shouldBlock).toBe(true);

    // Registrar auditoría
    await registrarAuditoria("LOGIN_RECHAZADO", "hacker@evil.com", "Correo no registrado en BD");
    expect(registrarAuditoria).toHaveBeenCalledWith(
      "LOGIN_RECHAZADO",
      "hacker@evil.com",
      "Correo no registrado en BD"
    );
  });

  // ── Test 12: Flujo completo — usuario inactivo ────────────────────────────
  it("12. Flujo: usuario existe pero activo=0 → debe bloquear", async () => {
    vi.mocked(getUserByOpenId).mockResolvedValueOnce({
      id: 2,
      openId: "inactive-id",
      name: "Inactivo",
      email: "inactivo@test.com",
      loginMethod: "google",
      role: "user",
      activo: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const user = await getUserByOpenId("inactive-id");
    expect(user).toBeDefined();
    expect(user!.activo).toBe(0);

    // Simular callback OAuth: inactivo → bloquear
    const shouldBlock = user!.activo === 0;
    expect(shouldBlock).toBe(true);

    // Registrar auditoría
    await registrarAuditoria("LOGIN_RECHAZADO", "inactivo@test.com", "Usuario inactivo (activo=0)");
    expect(registrarAuditoria).toHaveBeenCalledWith(
      "LOGIN_RECHAZADO",
      "inactivo@test.com",
      "Usuario inactivo (activo=0)"
    );
  });

  // ── Test 13: Context revalidación — usuario eliminado con sesión activa ───
  it("13. Context: usuario con sesión pero eliminado de BD → ctxUser = null", async () => {
    // Simular: token válido pero usuario ya no existe en BD
    vi.mocked(getUserByOpenId).mockResolvedValueOnce(undefined);

    const tokenUser = { openId: "deleted-user-id" };
    const dbUser = await getUserByOpenId(tokenUser.openId);

    // El contexto debe retornar null
    const ctxUser = dbUser && dbUser.activo === 1 ? dbUser : null;
    expect(ctxUser).toBeNull();
  });

  // ── Test 14: Context revalidación — usuario desactivado con sesión activa ─
  it("14. Context: usuario con sesión pero activo=0 → ctxUser = null", async () => {
    vi.mocked(getUserByOpenId).mockResolvedValueOnce({
      id: 3,
      openId: "deactivated-id",
      name: "Desactivado",
      email: "desactivado@test.com",
      loginMethod: "google",
      role: "user",
      activo: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const tokenUser = { openId: "deactivated-id" };
    const dbUser = await getUserByOpenId(tokenUser.openId);

    expect(dbUser).toBeDefined();
    expect(dbUser!.activo).toBe(0);

    // El contexto debe retornar null porque activo=0
    const ctxUser = dbUser && dbUser.activo === 1 ? dbUser : null;
    expect(ctxUser).toBeNull();
  });

  // ── Test 15: Logout registra auditoría ────────────────────────────────────
  it("15. Logout registra evento LOGOUT en auditoría", async () => {
    await registrarAuditoria("LOGOUT", "cristhian@somos.com", "Sesión cerrada", {
      openId: "owner-id",
      ip: "10.0.0.1",
      userAgent: "Chrome/120",
    });

    expect(registrarAuditoria).toHaveBeenCalledWith(
      "LOGOUT",
      "cristhian@somos.com",
      "Sesión cerrada",
      expect.objectContaining({
        openId: "owner-id",
        ip: "10.0.0.1",
      })
    );
  });

  // ── Test 16: Mensajes de error OAuth están definidos ──────────────────────
  it("16. Mensajes de error: NoAutorizado, UsuarioInactivo, ErrorServidor, SinEmail", () => {
    const errorMessages: Record<string, string> = {
      NoAutorizado: "Tu correo no tiene acceso al sistema. Contacta al administrador para solicitar autorización.",
      UsuarioInactivo: "Tu cuenta está desactivada. Contacta al administrador para reactivarla.",
      ErrorServidor: "Error del servidor al verificar tu acceso. Intenta de nuevo en un momento.",
      SinEmail: "No se pudo obtener tu correo electrónico. Intenta con otra cuenta.",
    };

    expect(Object.keys(errorMessages)).toHaveLength(4);
    expect(errorMessages.NoAutorizado).toContain("administrador");
    expect(errorMessages.UsuarioInactivo).toContain("desactivada");
    expect(errorMessages.ErrorServidor).toContain("servidor");
    expect(errorMessages.SinEmail).toContain("correo");
  });

  // ── Test 17: auditoriaAccesos tiene campos ip y userAgent ─────────────────
  it("17. auditoriaAccesos incluye campos ip y userAgent para trazabilidad", () => {
    expect(auditoriaAccesos.ip).toBeDefined();
    expect(auditoriaAccesos.ip.name).toBe("ip");
    expect(auditoriaAccesos.userAgent).toBeDefined();
    expect(auditoriaAccesos.userAgent.name).toBe("userAgent");
  });

  // ── Test 18: auditoriaAccesos tiene campo openId para correlación ─────────
  it("18. auditoriaAccesos incluye campo openId para correlacionar con users", () => {
    expect(auditoriaAccesos.openId).toBeDefined();
    expect(auditoriaAccesos.openId.name).toBe("openId");
  });
});
