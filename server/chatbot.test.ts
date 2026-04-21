/**
 * Tests del Chatbot "Stock" — Asistente Virtual JIT
 * Verifica: router registrado, welcome con datos reales, sendMessage con Gemini,
 * manejo de errores y límites de historial.
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
import { chatbotRouter } from "./routers/chatbot";
import { invokeLLM } from "./_core/llm";
import { getDashboardKPIs, getJITAlerts, getStockCeroConOC } from "./db";
import { appRouter } from "./routers";

// ── Helper: crear caller (patrón del proyecto) ────────────────────────────────
const caller = appRouter.createCaller({} as any);

// ─────────────────────────────────────────────────────────────────────────────
describe("Chatbot Stock — Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    // El router debe tener los procedimientos definidos
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
    // Debe mencionar el stock cero (632 referencias)
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

  // ── Test 5: sendMessage inyecta contexto dinámico de inventario ───────────
  it("5. sendMessage inyecta KPIs reales en el system prompt", async () => {
    const messages = [{ role: "user" as const, content: "Estado del inventario" }];

    await caller.chatbot.sendMessage({ messages });

    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const systemContent = callArgs.messages[0].content as string;

    // Debe incluir datos reales de la BD
    expect(systemContent).toContain("1828");    // totalRefs
    expect(systemContent).toContain("632");     // zeroStock
    expect(systemContent).toContain("264");     // totalPending
    expect(systemContent).toContain("58");      // stockCeroConOC
    expect(getDashboardKPIs).toHaveBeenCalled();
    expect(getJITAlerts).toHaveBeenCalled();
    expect(getStockCeroConOC).toHaveBeenCalled();
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

  // ── Test 11: contexto incluye top 5 críticos ─────────────────────────────
  it("11. sendMessage incluye referencias críticas en el contexto", async () => {
    const messages = [{ role: "user" as const, content: "¿Qué es crítico?" }];

    await caller.chatbot.sendMessage({ messages });

    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const systemContent = callArgs.messages[0].content as string;

    // Debe incluir las referencias críticas del mock
    expect(systemContent).toContain("U115940");
    expect(systemContent).toContain("GLOBAL VIDRIO SAS");
  });

  // ── Test 12: contexto degradado si BD falla ───────────────────────────────
  it("12. sendMessage continúa si el contexto de BD falla", async () => {
    vi.mocked(getDashboardKPIs).mockRejectedValueOnce(new Error("DB timeout"));
    vi.mocked(getJITAlerts).mockRejectedValueOnce(new Error("DB timeout"));
    vi.mocked(getStockCeroConOC).mockRejectedValueOnce(new Error("DB timeout"));

    const messages = [{ role: "user" as const, content: "Consulta" }];

    // No debe lanzar error — debe continuar con contexto degradado
    const result = await caller.chatbot.sendMessage({ messages });
    expect(result.role).toBe("assistant");
    expect(result.content).toBeDefined();
  });
});
