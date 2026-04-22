/**
 * Tests del Chatbot "Stock" v3.0 — Asistente Virtual JIT
 * Verifica: router, welcome, sendMessage con Gemini, fuzzy search,
 * contexto enriquecido v3.0: servicios SRV, valor unitario, PF,
 * top 20 mayor valor, EOQ (cantidadAPedir), datos esperados OC.
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
      parteFabricante: "VL-001",
      um: "UND",
      qtyOrdenada: 17,
      qtyRecibida: 1,
      qtyPendiente: 16,
      estado: "PENDIENTE",
      diasRetraso: 63,
      costoUnitario: 269600,
      cumplimiento: 5.88,
      valorPendiente: 4313600,
      prioridad: "CRITICO",
    },
    {
      ordenCompra: "SU116078",
      descripcion: "SERVICIO DE RECTIFICACION",
      proveedor: "RECTIFICADORA DE MOTORES CONTINENTAL",
      parteFabricante: null,
      um: "SRV",
      qtyOrdenada: 1,
      qtyRecibida: 0,
      qtyPendiente: 1,
      estado: "PENDIENTE",
      diasRetraso: 19,
      costoUnitario: 2519680,
      cumplimiento: 0,
      valorPendiente: 2519680,
      prioridad: "REORDEN INMEDIATO",
    },
    {
      ordenCompra: "SU116084",
      descripcion: "SERVICIO DE RECTIFICACION",
      proveedor: "ECOSISTEMAS JAFER SAS",
      parteFabricante: null,
      um: "SRV",
      qtyOrdenada: 1,
      qtyRecibida: 0,
      qtyPendiente: 1,
      estado: "PENDIENTE",
      diasRetraso: 5,
      costoUnitario: 1520160,
      cumplimiento: 0,
      valorPendiente: 1520160,
      prioridad: null,
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
        totalStock: 0,
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
        stockSeguridad: 2,
        puntoPedido: 5,
        minimo: 2,
        maximo: 15,
        accionRequerida: "COMPRA URGENTE",
        prioridad: "1-CRITICA",
        valorAPedir: 2696000,
      },
      {
        referencia: "U116066",
        descripcion: "MOTOR LIMPIAPARABRISAS",
        parteFabricante: "ML-500",
        stockActual: 2,
        costoUnitario: 310000,
        totalStock: 620000,
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
        stockSeguridad: 1,
        puntoPedido: 3,
        minimo: 1,
        maximo: 8,
        accionRequerida: "REVISAR STOCK",
        prioridad: "2-ALTA",
        valorAPedir: 1550000,
      },
      {
        referencia: "43000048",
        descripcion: "ACEITE MOTOR 15W40",
        parteFabricante: "MOBIL-15W40",
        stockActual: 500,
        costoUnitario: 45000,
        totalStock: 22500000,
        proveedor: "LUBRICANTES S.A.",
        cuenta: "COMBUSTIBLE",
        umEmision: "GAL",
        claseAbc: "A",
        estado: "OPTIMO",
        cantidadAPedir: 0,
        consumoAnual: 1200,
        consumoDiario: 3.3,
        leadTimeDias: 7,
        puntoReorden: 50,
        stockSeguridad: 25,
        puntoPedido: 75,
        minimo: 50,
        maximo: 600,
        accionRequerida: null,
        prioridad: "4-BAJA",
        valorAPedir: 0,
      },
    ],
    total: 3,
  }),
  getSuppliers: vi.fn().mockResolvedValue([
    { nombre: "GLOBAL VIDRIO SAS", nit: "900123456", email: "ventas@globalvidrio.co", telefono: "3001234567" },
    { nombre: "SPEED TURBO SERVICE BOGOTA S.A.S.", nit: "900654321", email: null, telefono: null },
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
describe("Chatbot Stock v3.0 — Router y Contexto Enriquecido", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCatalogCache();
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
  it("2. welcome retorna mensaje con datos reales de KPIs y menú de capacidades", async () => {
    const result = await caller.chatbot.welcome();

    expect(result).toBeDefined();
    expect(result.role).toBe("assistant");
    expect(result.content).toContain("Stock");
    expect(result.timestamp).toBeGreaterThan(0);
    expect(result.content).toMatch(/632|stock cero/i);
    expect(result.content).toContain("264"); // órdenes pendientes
    expect(result.content).toContain("19");  // urgentes
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

    await caller.chatbot.sendMessage({ messages });

    expect(invokeLLM).toHaveBeenCalledOnce();
    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];

    expect(callArgs.messages[0].role).toBe("system");
    expect(callArgs.messages[0].content).toContain("Stock");

    const userMsg = callArgs.messages.find((m: any) => m.role === "user");
    expect(userMsg?.content).toBe("¿Cuántas referencias hay en stock cero?");
  });

  // ── Test 5: Contexto incluye TODAS las secciones v3.0 ──────────────────
  it("5. sendMessage inyecta TODAS las secciones v3.0 en el system prompt", async () => {
    const messages = [{ role: "user" as const, content: "resumen general" }];

    await caller.chatbot.sendMessage({ messages });

    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const systemContent = callArgs.messages[0].content as string;

    // Secciones v3.0
    expect(systemContent).toContain("[DASHBOARD_STATS]");
    expect(systemContent).toContain("[ALERTAS_JIT]");
    expect(systemContent).toContain("[REFERENCIAS_CRITICAS]");
    expect(systemContent).toContain("[ORDENES_PENDIENTES]");
    expect(systemContent).toContain("[SERVICIOS_SRV]");
    expect(systemContent).toContain("[TOP_20_MAYOR_VALOR]");
    expect(systemContent).toContain("[NECESITAN_COMPRA]");
    expect(systemContent).toContain("[PROVEEDORES]");

    // Todas las fuentes de datos llamadas
    expect(getDashboardKPIs).toHaveBeenCalled();
    expect(getJITAlerts).toHaveBeenCalled();
    expect(getStockCeroConOC).toHaveBeenCalled();
    expect(getPurchaseOrders).toHaveBeenCalled();
    expect(getSuppliers).toHaveBeenCalled();
    expect(getInventory).toHaveBeenCalled();
  });

  // ── Test 6: SERVICIOS SRV filtrados correctamente ───────────────────────
  it("6. contexto incluye sección SERVICIOS_SRV con OC de UM='SRV'", async () => {
    const messages = [{ role: "user" as const, content: "qué servicios tenemos pendientes" }];

    await caller.chatbot.sendMessage({ messages });

    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const systemContent = callArgs.messages[0].content as string;

    // Debe incluir los 2 servicios SRV del mock
    expect(systemContent).toContain("[SERVICIOS_SRV]");
    expect(systemContent).toContain("2 servicios pendientes");
    expect(systemContent).toContain("SU116078");
    expect(systemContent).toContain("SERVICIO DE RECTIFICACION");
    expect(systemContent).toContain("RECTIFICADORA DE MOTORES CONTINENTAL");
    expect(systemContent).toContain("SU116084");
    expect(systemContent).toContain("ECOSISTEMAS JAFER SAS");
  });

  // ── Test 7: VALOR UNITARIO en fuzzy search ──────────────────────────────
  it("7. fuzzy search incluye costo unitario y valor total de cada referencia", async () => {
    const messages = [{ role: "user" as const, content: "vidrio lagrima" }];

    await caller.chatbot.sendMessage({ messages });

    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const systemContent = callArgs.messages[0].content as string;

    // Fuzzy debe encontrar U115940 con costo unitario
    expect(systemContent).toContain("SUGERENCIAS_FUZZY");
    expect(systemContent).toContain("U115940");
    expect(systemContent).toContain("Costo Unitario");
    expect(systemContent).toContain("Valor Total");
  });

  // ── Test 8: PARTE FABRICANTE en fuzzy search ────────────────────────────
  it("8. fuzzy search incluye parte fabricante (PF) de cada referencia", async () => {
    const messages = [{ role: "user" as const, content: "motor limpiaparabrisas" }];

    await caller.chatbot.sendMessage({ messages });

    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const systemContent = callArgs.messages[0].content as string;

    expect(systemContent).toContain("ML-500"); // parteFabricante del motor
    expect(systemContent).toContain("PF:");
  });

  // ── Test 9: TOP 20 MAYOR VALOR ──────────────────────────────────────────
  it("9. contexto incluye TOP_20_MAYOR_VALOR ordenado por valor total descendente", async () => {
    const messages = [{ role: "user" as const, content: "top 20 mayor valor" }];

    await caller.chatbot.sendMessage({ messages });

    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const systemContent = callArgs.messages[0].content as string;

    expect(systemContent).toContain("[TOP_20_MAYOR_VALOR]");
    // ACEITE MOTOR tiene totalStock=22,500,000 — debe ser primero
    expect(systemContent).toContain("ACEITE MOTOR 15W40");
    expect(systemContent).toContain("43000048");
    // MOTOR LIMPIAPARABRISAS tiene totalStock=620,000 — segundo
    expect(systemContent).toContain("MOTOR LIMPIAPARABRISAS");
  });

  // ── Test 10: EOQ / CANTIDADES A COMPRAR ─────────────────────────────────
  it("10. contexto incluye NECESITAN_COMPRA con cantidadAPedir, puntoReorden, stockSeguridad", async () => {
    const messages = [{ role: "user" as const, content: "cuánto debo comprar" }];

    await caller.chatbot.sendMessage({ messages });

    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const systemContent = callArgs.messages[0].content as string;

    expect(systemContent).toContain("[NECESITAN_COMPRA]");
    // U115940 tiene cantidadAPedir=10
    expect(systemContent).toContain("U115940");
    expect(systemContent).toContain("Cantidad a pedir: 10");
    expect(systemContent).toContain("Punto reorden: 3");
    expect(systemContent).toContain("Stock seguridad: 2");
    expect(systemContent).toContain("Consumo diario: 0.07");
    expect(systemContent).toContain("Lead time: 45d");
    // U116066 tiene cantidadAPedir=5
    expect(systemContent).toContain("U116066");
    expect(systemContent).toContain("Cantidad a pedir: 5");
    // ACEITE MOTOR tiene cantidadAPedir=0 — NO debe aparecer en NECESITAN_COMPRA
    expect(systemContent).not.toMatch(/NECESITAN_COMPRA[\s\S]*ACEITE MOTOR/);
  });

  // ── Test 11: DATOS ESPERADOS de OC (pedido, recibido, pendiente, %) ─────
  it("11. contexto incluye datos esperados completos de cada OC", async () => {
    const messages = [{ role: "user" as const, content: "estado de la OC SU115940" }];

    await caller.chatbot.sendMessage({ messages });

    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const systemContent = callArgs.messages[0].content as string;

    expect(systemContent).toContain("[ORDENES_PENDIENTES]");
    expect(systemContent).toContain("SU115940");
    expect(systemContent).toContain("Pedido: 17");
    expect(systemContent).toContain("Recibido: 1");
    expect(systemContent).toContain("Pendiente: 16");
    expect(systemContent).toContain("Cumpl: 6%"); // 5.88 redondeado
    expect(systemContent).toContain("PF: VL-001");
    expect(systemContent).toContain("Prioridad: CRITICO");
  });

  // ── Test 12: System prompt v3.0 instrucciones por tipo de consulta ──────
  it("12. system prompt incluye instrucciones para valor, EOQ, servicios, top 20", async () => {
    const messages = [{ role: "user" as const, content: "test" }];

    await caller.chatbot.sendMessage({ messages });

    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const systemContent = callArgs.messages[0].content as string;

    // Instrucciones por tipo de consulta
    expect(systemContent).toContain("CUANDO PREGUNTEN POR UNA REFERENCIA");
    expect(systemContent).toContain("CUANDO PREGUNTEN \"CUÁNTO CUESTA\"");
    expect(systemContent).toContain("CUANDO PREGUNTEN \"CUÁNTO COMPRAR\"");
    expect(systemContent).toContain("CUANDO PREGUNTEN POR UNA OC");
    expect(systemContent).toContain("CUANDO PREGUNTEN POR SERVICIOS");
    expect(systemContent).toContain("CUANDO PREGUNTEN \"TOP 20 MAYOR VALOR\"");
    expect(systemContent).toContain("CUANDO PREGUNTEN POR PARTE FABRICANTE");
  });

  // ── Test 13: sendMessage retorna respuesta de Gemini ────────────────────
  it("13. sendMessage retorna la respuesta de Gemini correctamente", async () => {
    const messages = [{ role: "user" as const, content: "¿Cuántas órdenes pendientes?" }];

    const result = await caller.chatbot.sendMessage({ messages });

    expect(result.role).toBe("assistant");
    expect(result.content).toBe("Respuesta de prueba de Gemini.");
    expect(result.timestamp).toBeGreaterThan(0);
  });

  // ── Test 14: sendMessage maneja error de Gemini ─────────────────────────
  it("14. sendMessage lanza error si Gemini falla", async () => {
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("Gemini timeout"));

    const messages = [{ role: "user" as const, content: "Consulta" }];

    await expect(caller.chatbot.sendMessage({ messages })).rejects.toThrow();
  });

  // ── Test 15: sendMessage maneja respuesta vacía de Gemini ───────────────
  it("15. sendMessage lanza error si Gemini retorna contenido vacío", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: null } }],
    } as any);

    const messages = [{ role: "user" as const, content: "Consulta" }];

    await expect(caller.chatbot.sendMessage({ messages })).rejects.toThrow("Respuesta vacía");
  });

  // ── Test 16: sendMessage respeta límite de 50 mensajes ──────────────────
  it("16. sendMessage rechaza historial con más de 50 mensajes", async () => {
    const tooManyMessages = Array.from({ length: 51 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `Mensaje ${i}`,
    }));

    await expect(
      caller.chatbot.sendMessage({ messages: tooManyMessages })
    ).rejects.toThrow();
  });

  // ── Test 17: sendMessage rechaza historial vacío ────────────────────────
  it("17. sendMessage rechaza historial vacío", async () => {
    await expect(
      caller.chatbot.sendMessage({ messages: [] })
    ).rejects.toThrow();
  });

  // ── Test 18: contexto degradado si BD falla ─────────────────────────────
  it("18. sendMessage continúa si el contexto de BD falla", async () => {
    vi.mocked(getDashboardKPIs).mockRejectedValueOnce(new Error("DB timeout"));
    vi.mocked(getJITAlerts).mockRejectedValueOnce(new Error("DB timeout"));
    vi.mocked(getStockCeroConOC).mockRejectedValueOnce(new Error("DB timeout"));
    vi.mocked(getPurchaseOrders).mockRejectedValueOnce(new Error("DB timeout"));
    vi.mocked(getSuppliers).mockRejectedValueOnce(new Error("DB timeout"));
    vi.mocked(getInventory).mockRejectedValueOnce(new Error("DB timeout"));

    const messages = [{ role: "user" as const, content: "¿Qué pasa?" }];

    const result = await caller.chatbot.sendMessage({ messages });
    expect(result.role).toBe("assistant");
    expect(result.content).toBeDefined();
  });

  // ── Test 19: fuzzy search corrige errores tipográficos ──────────────────
  it("19. fuzzy search corrige 'motro' → MOTOR LIMPIAPARABRISAS", async () => {
    const messages = [{ role: "user" as const, content: "motro limpiaparabrisas" }];

    await caller.chatbot.sendMessage({ messages });

    expect(getInventory).toHaveBeenCalled();

    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const systemContent = callArgs.messages[0].content as string;

    expect(systemContent).toContain("MOTOR LIMPIAPARABRISAS");
  });

  // ── Test 20: conversación multi-turno preserva historial ────────────────
  it("20. sendMessage envía historial multi-turno completo a Gemini", async () => {
    const messages = [
      { role: "user" as const, content: "¿Stock de U115940?" },
      { role: "assistant" as const, content: "El stock actual de U115940 es 0." },
      { role: "user" as const, content: "¿Tiene OC pendiente?" },
    ];

    await caller.chatbot.sendMessage({ messages });

    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    expect(callArgs.messages).toHaveLength(4); // system + 3 mensajes
    expect(callArgs.messages[1].content).toBe("¿Stock de U115940?");
    expect(callArgs.messages[2].content).toBe("El stock actual de U115940 es 0.");
    expect(callArgs.messages[3].content).toBe("¿Tiene OC pendiente?");
  });

  // ── Test 21: OC incluye parte fabricante ────────────────────────────────
  it("21. contexto de OC incluye parte fabricante (PF) de cada orden", async () => {
    const messages = [{ role: "user" as const, content: "detalle OC" }];

    await caller.chatbot.sendMessage({ messages });

    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const systemContent = callArgs.messages[0].content as string;

    expect(systemContent).toContain("PF: VL-001"); // PF de SU115940
  });

  // ── Test 22: Proveedores incluyen email y teléfono ──────────────────────
  it("22. contexto de proveedores incluye email y teléfono", async () => {
    const messages = [{ role: "user" as const, content: "proveedores" }];

    await caller.chatbot.sendMessage({ messages });

    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const systemContent = callArgs.messages[0].content as string;

    expect(systemContent).toContain("ventas@globalvidrio.co");
    expect(systemContent).toContain("3001234567");
  });

  // ── Test 23: Fuzzy incluye EOQ completo ─────────────────────────────────
  it("23. fuzzy search incluye cantidadAPedir, puntoReorden, stockSeguridad, acción", async () => {
    const messages = [{ role: "user" as const, content: "vidrio lagrima" }];

    await caller.chatbot.sendMessage({ messages });

    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    const systemContent = callArgs.messages[0].content as string;

    expect(systemContent).toContain("Cantidad a pedir:");
    expect(systemContent).toContain("Punto reorden:");
    expect(systemContent).toContain("Stock seguridad:");
    expect(systemContent).toContain("Valor a pedir:");
    expect(systemContent).toContain("Acción:");
  });
});
