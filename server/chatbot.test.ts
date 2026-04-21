/**
 * Tests del Chatbot "Stock" v2.0 — Asistente Virtual JIT
 * Verifica: router, welcome, sendMessage con Gemini, fuzzy search,
 * contexto enriquecido (OC, proveedores, EOQ), manejo de errores.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDashboardKPIs: vi.fn().mockResolvedValue({
    totalRefs: 1828,
    totalValue: 2067844421,
    zeroStock: 632,
    totalPending: 264,
    stockCeroConOC: 58,
    urgentOrders: 19,
    withStock: 1196,
    avgStock: 12.3,
    classA: 1144,
    classB: 335,
    classC: 349,
  }),
  getJITAlerts: vi.fn().mockResolvedValue({
    critico: 19,
    reorden: 45,
    precaucion: 120,
    optimo: 1644,
  }),
  getStockCeroConOC: vi.fn().mockResolvedValue([
    {
      referencia: "U115940",
      descripcion: "VIDRIO TIPO LAGRIMA",
      ordenCompra: "OC-001",
      diasRetraso: 63,
      proveedorOC: "GLOBAL VIDRIO SAS",
      proveedorInventario: "GLOBAL VIDRIO SAS",
      parteFabricante: "VL-001",
    },
    {
      referencia: "U116070",
      descripcion: "INYECTOR BOMBA",
      ordenCompra: "OC-002",
      diasRetraso: 47,
      proveedorOC: "SPEED TURBO SERVICE",
      proveedorInventario: "SPEED TURBO SERVICE",
      parteFabricante: "IB-200",
    },
  ]),
  getPurchaseOrders: vi.fn().mockResolvedValue([
    {
      ordenCompra: "SU115940",
      descripcion: "VIDRIO TIPO LAGRIMA 1179*705 MM",
      proveedor: "GLOBAL VIDRIO SAS",
      qtyOrdenada: 17,
      qtyRecibida: 1,
      qtyPendiente: 16,
      estado: "PENDIENTE",
      diasRetraso: 63,
      costoUnitario: 269600,
    },
  ]),
  getInventory: vi.fn().mockResolvedValue({
    items: [
      {
        referencia: "U115940",
        descripcion: "VIDRIO TIPO LAGRIMA 1179*705 MM",
        parteFabricante: "VL-001",
        stockActual: 0,
        costoUnitario: 269600,
        proveedor: "GLOBAL VIDRIO SAS",
        cuenta: "CARROCERIA",
        umEmision: "UND",
        claseAbc: "A",
        estado: "CRITICO",
        cantidadAPedir: 10,
        consumoAnual: 24,
        consumoDiario: 0.07,
        leadTimeDias: 45,
        puntoReorden: 3,
      },
      {
        referencia: "U116066",
        descripcion: "MOTOR LIMPIAPARABRISAS",
        parteFabricante: "ML-500",
        stockActual: 2,
        costoUnitario: 310000,
        proveedor: "UNIVERSAL DE PARTES",
        cuenta: "ELECTRICO",
        umEmision: "UND",
        claseAbc: "A",
        estado: "PRECAUCION",
        cantidadAPedir: 5,
        consumoAnual: 12,
        consumoDiario: 0.03,
        leadTimeDias: 30,
        puntoReorden: 2,
      },
    ],
    total: 2,
  }),
  getSuppliers: vi.fn().mockResolvedValue([
    { nombre: "GLOBAL VIDRIO SAS", nit: "900123456" },
    { nombre: "SPEED TURBO SERVICE BOGOTA S.A.S.", nit: "900654321" },
  ]),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: "Actualmente hay 632 referencias con stock cero en el inventario de Somos Bogotá Usme.",
        },
      },
    ],
  }),
}));

// ── Importar después de mocks ─────────────────────────────────────────────────
import { chatbotRouter, resetCatalogCache } from "./routers/chatbot";
import { invokeLLM } from "./_core/llm";
import { getDashboardKPIs, getJITAlerts, getStockCeroConOC, getPurchaseOrders, getInventory, getSuppliers } from "./db";
import { appRouter } from "./routers";

// ── Helper: crear caller ──────────────────────────────────────────────────────
const caller = appRouter.createCaller({} as any);

// ─────────────────────────────────────────────────────────────────────────────
describe("Chatbot Stock v2.0 — Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCatalogCache(); // Limpiar cache de fuzzy search entre tests
    // Restaurar mocks a valores por defecto
    vi.mocked(getDashboardKPIs).mockResolvedValue({
      totalRefs: 1828,
      totalValue: 2067844421,
      zeroStock: 632,
      totalPending: 264,
      stockCeroConOC: 58,
      urgentOrders: 19,
      withStock: 1196,
      avgStock: 12.3,
      classA: 1144,
      classB: 335,
      classC: 349,
    });
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [{ message: { content: "Respuesta de prueba de Gemini." } }],
    } as any);
  });

  // ── Test 1: Router registrado ─────────────────────────────────────────────
  it("1. chatbotRouter exporta sendMessage y welcome", () => {
    expect(chatbotRouter).toBeDefined();
    const procedures = Object.keys(chatbotRouter._def.procedures);
    expect(procedures).toContain("sendMessage");
    expect(procedures).toContain("welcome");
  });

  // ── Test 2: Welcome con datos reales ─────────────────────────────────────
  it("2. welcome retorna mensaje con datos reales de KPIs", async () => {
    const result = await caller.chatbot.welcome();

    expect(result).toBeDefined();
    expect(result.role).toBe("assistant");
    expect(result.content).toContain("Stock");
    expect(result.timestamp).toBeGreaterThan(0);
    expect(result.content).toMatch(/632|stock cero|inventario/i);
    expect(getDashboardKPIs).toHaveBeenCalledOnce();
  });

  // ── Test 3: Welcome con KPIs fallidos ────────────────────────────────────
  it("3. welcome retorna mensaje genérico si KPIs fallan", async () => {
    vi.mocked(getDashboardKPIs).mockRejectedValueOnce(new Error("DB error"));

    const result = await caller.chatbot.welcome();

    expect(result.role).toBe("assistant");
    expect(result.content).toContain("Stock");
    expect(result.content).toContain("JIT");
  });

  // ── Test 4: sendMessage llama a Gemini con historial ─────────────────────
  it("4. sendMessage invoca Gemini con el historial completo", async () => {
    const messages = [
      { role: "user" as const, content: "¿Cuántas referencias hay en stock cero?" },
    ];

    const result = await caller.chatbot.sendMessage({ messages });

    expect(invokeLLM).toHaveBeenCalledOnce();
    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];

    // Debe incluir system prompt con identidad de Stock
    expect(callArgs.messages[0].role).toBe("system");
    expect(callArgs.messages[0].content).toContain("Stock");
    expect(callArgs.messages[0].content).toContain("JIT");

    // Debe incluir el mensaje del usuario
    const userMsg = callArgs.messages.find((m: any) => m.role === "user");
    expect(userMsg?.content).toBe("¿Cuántas referencias hay en stock cero?");
  });

  // ── Test 5: sendMessage inyecta contexto dinámico enriquecido ────────────
  it("5. sendMessage inyecta KPIs, OC, proveedores y alertas en el system prompt", async () => {
    const messages = [{ role: "user" as const, content: "Estado del inventario" }];

    await caller.chatbot.sendMessage({ messages });

    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const systemContent = callArgs.messages[0].content as string;

    // KPIs
    expect(systemContent).toContain("1828");    // totalRefs
    expect(systemContent).toContain("632");     // zeroStock
    expect(systemContent).toContain("264");     // totalPending
    expect(systemContent).toContain("58");      // stockCeroConOC

    // Debe llamar a TODAS las fuentes de datos
    expect(getDashboardKPIs).toHaveBeenCalled();
    expect(getJITAlerts).toHaveBeenCalled();
    expect(getStockCeroConOC).toHaveBeenCalled();
    expect(getPurchaseOrders).toHaveBeenCalled();
    expect(getSuppliers).toHaveBeenCalled();
    expect(getInventory).toHaveBeenCalled();
  });

  // ── Test 6: sendMessage retorna respuesta de Gemini ──────────────────────
  it("6. sendMessage retorna la respuesta de Gemini correctamente", async () => {
    const messages = [{ role: "user" as const, content: "¿Cuántas órdenes pendientes?" }];

    const result = await caller.chatbot.sendMessage({ messages });

    expect(result.role).toBe("assistant");
    expect(result.content).toBe("Respuesta de prueba de Gemini.");
    expect(result.timestamp).toBeGreaterThan(0);
  });

  // ── Test 7: sendMessage maneja error de Gemini ───────────────────────────
  it("7. sendMessage lanza error si Gemini falla", async () => {
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("Gemini timeout"));

    const messages = [{ role: "user" as const, content: "Consulta" }];

    await expect(caller.chatbot.sendMessage({ messages })).rejects.toThrow();
  });

  // ── Test 8: sendMessage maneja respuesta vacía de Gemini ─────────────────
  it("8. sendMessage lanza error si Gemini retorna contenido vacío", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: null } }],
    } as any);

    const messages = [{ role: "user" as const, content: "Consulta" }];

    await expect(caller.chatbot.sendMessage({ messages })).rejects.toThrow("Respuesta vacía");
  });

  // ── Test 9: sendMessage respeta límite de 50 mensajes ────────────────────
  it("9. sendMessage rechaza historial con más de 50 mensajes", async () => {
    const tooManyMessages = Array.from({ length: 51 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `Mensaje ${i}`,
    }));

    await expect(
      caller.chatbot.sendMessage({ messages: tooManyMessages })
    ).rejects.toThrow();
  });

  // ── Test 10: sendMessage requiere al menos 1 mensaje ─────────────────────
  it("10. sendMessage rechaza historial vacío", async () => {
    await expect(
      caller.chatbot.sendMessage({ messages: [] })
    ).rejects.toThrow();
  });

  // ── Test 11: contexto incluye referencias críticas y proveedores ─────────
  it("11. sendMessage incluye referencias críticas y proveedores en el contexto", async () => {
    const messages = [{ role: "user" as const, content: "¿Qué es crítico?" }];

    await caller.chatbot.sendMessage({ messages });

    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const systemContent = callArgs.messages[0].content as string;

    // Referencias críticas
    expect(systemContent).toContain("U115940");
    expect(systemContent).toContain("GLOBAL VIDRIO SAS");

    // Proveedores
    expect(systemContent).toContain("PROVEEDORES");
    expect(systemContent).toContain("900123456");

    // OC detalladas
    expect(systemContent).toContain("ORDENES_RELEVANTES");
    expect(systemContent).toContain("SU115940");
  });

  // ── Test 12: contexto degradado si BD falla ───────────────────────────────
  it("12. sendMessage continúa si el contexto de BD falla", async () => {
    vi.mocked(getDashboardKPIs).mockRejectedValueOnce(new Error("DB timeout"));
    vi.mocked(getJITAlerts).mockRejectedValueOnce(new Error("DB timeout"));
    vi.mocked(getStockCeroConOC).mockRejectedValueOnce(new Error("DB timeout"));
    vi.mocked(getPurchaseOrders).mockRejectedValueOnce(new Error("DB timeout"));
    vi.mocked(getSuppliers).mockRejectedValueOnce(new Error("DB timeout"));
    vi.mocked(getInventory).mockRejectedValueOnce(new Error("DB timeout"));

    const messages = [{ role: "user" as const, content: "Consulta" }];

    // No debe lanzar error — debe continuar con contexto degradado
    const result = await caller.chatbot.sendMessage({ messages });
    expect(result.role).toBe("assistant");
    expect(result.content).toBeDefined();
  });

  // ── Test 13: fuzzy search se ejecuta con el mensaje del usuario ──────────
  it("13. sendMessage ejecuta fuzzy search con el último mensaje del usuario", async () => {
    const messages = [{ role: "user" as const, content: "motro limpiaparabrisas" }];

    await caller.chatbot.sendMessage({ messages });

    // getInventory se llama para cargar el catálogo fuzzy
    expect(getInventory).toHaveBeenCalled();

    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const systemContent = callArgs.messages[0].content as string;

    // Fuzzy search debe encontrar MOTOR LIMPIAPARABRISAS
    expect(systemContent).toContain("MOTOR LIMPIAPARABRISAS");
  });

  // ── Test 14: system prompt v2.0 incluye reglas de fuzzy ──────────────────
  it("14. system prompt incluye instrucciones sobre SUGERENCIAS_FUZZY", async () => {
    const messages = [{ role: "user" as const, content: "test" }];

    await caller.chatbot.sendMessage({ messages });

    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const systemContent = callArgs.messages[0].content as string;

    expect(systemContent).toContain("SUGERENCIAS_FUZZY");
  });

  // ── Test 15: system prompt v2.0 incluye secciones de datos completos ─────
  it("15. system prompt incluye secciones DASHBOARD_STATS, ALERTAS_JIT, ORDENES_RELEVANTES, PROVEEDORES", async () => {
    const messages = [{ role: "user" as const, content: "resumen" }];

    await caller.chatbot.sendMessage({ messages });

    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const systemContent = callArgs.messages[0].content as string;

    expect(systemContent).toContain("[DASHBOARD_STATS]");
    expect(systemContent).toContain("[ALERTAS_JIT]");
    expect(systemContent).toContain("[ORDENES_RELEVANTES]");
    expect(systemContent).toContain("[PROVEEDORES]");
    expect(systemContent).toContain("[REFERENCIAS_RELEVANTES]");
  });

  // ── Test 16: conversación multi-turno preserva historial ─────────────────
  it("16. sendMessage envía historial multi-turno completo a Gemini", async () => {
    const messages = [
      { role: "user" as const, content: "¿Stock de U115940?" },
      { role: "assistant" as const, content: "El stock actual de U115940 es 0." },
      { role: "user" as const, content: "¿Tiene OC pendiente?" },
    ];

    await caller.chatbot.sendMessage({ messages });

    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    // system + 3 mensajes de historial = 4 total
    expect(callArgs.messages).toHaveLength(4);
    expect(callArgs.messages[1].content).toBe("¿Stock de U115940?");
    expect(callArgs.messages[2].content).toBe("El stock actual de U115940 es 0.");
    expect(callArgs.messages[3].content).toBe("¿Tiene OC pendiente?");
  });
});
