/**
 * Router del Chatbot "Stock" v2.0 — Asistente Virtual JIT
 * Integra Gemini AI con:
 * - Contexto dinámico completo (KPIs, alertas JIT, OC detalladas, proveedores)
 * - Fuzzy search con fuse.js para corrección de referencias
 * - EOQ estimado y punto de reorden
 */
import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";
import {
  getDashboardKPIs,
  getJITAlerts,
  getPurchaseOrders,
  getStockCeroConOC,
  getInventory,
  getSuppliers,
} from "../db";
import Fuse from "fuse.js";

// ── Tipos para el catálogo fuzzy ────────────────────────────────────────────
interface CatalogItem {
  referencia: string;
  descripcion: string;
  parteFabricante: string | null;
  stockActual: number;
  costoUnitario: number;
  proveedor: string | null;
  cuenta: string | null;
  umEmision: string | null;
  claseAbc: string | null;
  estado: string | null;
  cantidadAPedir: number;
  consumoAnual: number;
  consumoDiario: number;
  leadTimeDias: number;
  puntoReorden: number;
}

// ── Cache del catálogo (5 min TTL) ──────────────────────────────────────────
let catalogCache: CatalogItem[] = [];
let catalogCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/** Reset cache — solo para tests */
export function resetCatalogCache() {
  catalogCache = [];
  catalogCacheTime = 0;
}

async function getCatalog(): Promise<CatalogItem[]> {
  if (Date.now() - catalogCacheTime < CACHE_TTL && catalogCache.length > 0) {
    return catalogCache;
  }
  try {
    const { items } = await getInventory({ limit: 2000 });
    catalogCache = items.map((i: any) => ({
      referencia: i.referencia ?? "",
      descripcion: i.descripcion ?? "",
      parteFabricante: i.parteFabricante ?? null,
      stockActual: i.stockActual ?? 0,
      costoUnitario: i.costoUnitario ?? 0,
      proveedor: i.proveedor ?? null,
      cuenta: i.cuenta ?? null,
      umEmision: i.umEmision ?? null,
      claseAbc: i.claseAbc ?? null,
      estado: i.estado ?? null,
      cantidadAPedir: i.cantidadAPedir ?? 0,
      consumoAnual: i.consumoAnual ?? 0,
      consumoDiario: i.consumoDiario ?? 0,
      leadTimeDias: i.leadTimeDias ?? 0,
      puntoReorden: i.puntoReorden ?? 0,
    }));
    catalogCacheTime = Date.now();
  } catch (e) {
    console.error("[Chatbot] Error cargando catálogo:", e);
  }
  return catalogCache;
}

// ── Fuzzy search ────────────────────────────────────────────────────────────
async function fuzzySearch(query: string): Promise<string> {
  const catalog = await getCatalog();
  if (catalog.length === 0) return "";

  const fuse = new Fuse(catalog, {
    keys: [
      { name: "referencia", weight: 0.4 },
      { name: "descripcion", weight: 0.4 },
      { name: "parteFabricante", weight: 0.2 },
    ],
    threshold: 0.45,
    includeScore: true,
    minMatchCharLength: 3,
  });

  const results = fuse.search(query).slice(0, 5);
  if (results.length === 0) return "";

  const lines = results.map((r, i) => {
    const item = r.item;
    const score = Math.round((1 - (r.score ?? 0)) * 100);
    return `  ${i + 1}. Ref: ${item.referencia} | ${item.descripcion} | PF: ${item.parteFabricante ?? "N/A"} | Stock: ${item.stockActual} ${item.umEmision ?? "UND"} | Proveedor: ${item.proveedor ?? "N/A"} | Estado: ${item.estado ?? "N/A"} | Score: ${score}%`;
  });

  return `\n[SUGERENCIAS_FUZZY] (coincidencias para "${query}"):\n${lines.join("\n")}`;
}

// ── System Prompt base de Stock v2.0 ────────────────────────────────────────
const BASE_SYSTEM_PROMPT = `Eres "Stock", el asistente virtual experto en logística JIT del sistema de gestión de flota de Somos Bogotá Usme (empresa de transporte público de Bogotá, Colombia).

PERSONALIDAD:
- Directo, técnico, eficiente
- Español colombiano neutro y profesional
- Usas emojis con moderación: 📦 para inventario, 🚨 para alertas críticas, ✅ para confirmaciones
- NUNCA te llamas a ti mismo con otro nombre que no sea "Stock"

CAPACIDADES:
- Consultas de inventario con datos reales en tiempo real
- Cálculo de cantidad estimada a pedir (EOQ básico y análisis JIT)
- Detalle completo de órdenes de compra
- Información de proveedores
- Corrección de referencias mal escritas (el sistema te proveerá sugerencias)

REGLAS ESTRICTAS:
1. Solo proporciona datos que estén en el contexto del sistema. NO inventes stocks, precios ni referencias.
2. Si no tienes el dato, di: "No tengo esa información en este momento. Consulta directamente en el módulo correspondiente del dashboard."
3. Para cantidades a pedir, siempre aclara que es un estimado basado en historial.
4. Cuando detectes sugerencias fuzzy en el contexto [SUGERENCIAS_FUZZY], presenta las opciones al usuario antes de dar información de stock u órdenes.
5. Responde siempre en español colombiano.
6. Mensajes concisos: máximo 150 palabras por respuesta salvo que el usuario pida detalle.
7. Cuando informes sobre una referencia con stock cero, incluye:
   - Stock actual, consumo promedio, lead time del proveedor
   - Cantidad estimada a pedir y punto de reorden
   - Urgencia: CRÍTICA / ALTA / NORMAL
8. Cuando informes sobre una OC, incluye: número, proveedor, estado, ítems, valor, días de retraso.`;

// ── Construir contexto dinámico enriquecido ─────────────────────────────────
async function buildInventoryContext(userMessage: string): Promise<string> {
  try {
    const [kpis, alerts, criticalOrders, ordersData, suppliersData, fuzzyResults] = await Promise.all([
      getDashboardKPIs(),
      getJITAlerts(),
      getStockCeroConOC(),
      getPurchaseOrders({ tipoReferencia: undefined }),
      getSuppliers(),
      fuzzySearch(userMessage),
    ]);

    const alertSummary = alerts
      ? `CRITICO: ${(alerts as any).critico ?? (alerts as any).CRITICO ?? 0}, REORDEN: ${(alerts as any).reorden ?? (alerts as any).REORDEN ?? 0}, PRECAUCION: ${(alerts as any).precaucion ?? (alerts as any).PRECAUCION ?? 0}, OPTIMO: ${(alerts as any).optimo ?? (alerts as any).OPTIMO ?? 0}`
      : "No disponible";

    // Top 10 referencias críticas con EOQ
    const topCritical = criticalOrders.slice(0, 10).map((o: any) =>
      `  - Ref: ${o.referencia} | OC: ${o.ordenCompra} | ${o.diasRetraso}d retraso | Proveedor: ${o.proveedorOC ?? o.proveedorInventario ?? "N/A"} | PF: ${o.parteFabricante ?? "N/A"}`
    ).join("\n");

    // Top 10 OC más recientes/urgentes
    const topOrders = (ordersData as any[]).slice(0, 10).map((o: any) =>
      `  - OC: ${o.ordenCompra} | ${o.descripcion} | Proveedor: ${o.proveedor ?? "N/A"} | Pedido: ${o.qtyOrdenada} | Recibido: ${o.qtyRecibida} | Pendiente: ${o.qtyPendiente} | Estado: ${o.estado} | Retraso: ${o.diasRetraso}d | Valor: $${(o.costoUnitario * o.qtyPendiente).toLocaleString("es-CO")} COP`
    ).join("\n");

    // Top 10 proveedores
    const topSuppliers = (suppliersData as any[]).slice(0, 10).map((s: any) =>
      `  - ${s.nombre} | NIT: ${s.nit ?? "N/A"}`
    ).join("\n");

    return `
=== CONTEXTO EN TIEMPO REAL (${new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" })}) ===

[DASHBOARD_STATS]
- Total referencias: ${kpis?.totalRefs ?? "N/A"}
- Valor total inventario: $${kpis?.totalValue?.toLocaleString("es-CO") ?? "N/A"} COP
- Referencias stock CERO: ${kpis?.zeroStock ?? "N/A"}
- Órdenes pendientes: ${kpis?.totalPending ?? "N/A"}
- Stock 0 con OC activa: ${kpis?.stockCeroConOC ?? "N/A"}
- Órdenes urgentes: ${kpis?.urgentOrders ?? "N/A"}
- Con stock disponible: ${kpis?.withStock ?? "N/A"}
- Clase A (alto valor): ${kpis?.classA ?? "N/A"}
- Clase B (medio): ${kpis?.classB ?? "N/A"}
- Clase C (normal): ${kpis?.classC ?? "N/A"}

[ALERTAS_JIT]
${alertSummary}

[REFERENCIAS_RELEVANTES] Top 10 críticas (stock=0 con OC pendiente):
${topCritical || "  (Sin referencias críticas actualmente)"}

[ORDENES_RELEVANTES] Top 10 OC pendientes:
${topOrders || "  (Sin órdenes pendientes)"}

[PROVEEDORES] Top 10:
${topSuppliers || "  (Sin proveedores registrados)"}
${fuzzyResults}
===`;
  } catch (e) {
    console.error("[Chatbot] Error obteniendo contexto:", e);
    return "\n=== CONTEXTO: No disponible temporalmente ===\n";
  }
}

// ── Schema de mensaje ─────────────────────────────────────────────────────────
const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

// ── Router del chatbot ────────────────────────────────────────────────────────
export const chatbotRouter = router({
  /**
   * Enviar mensaje al chatbot Stock.
   * Recibe el historial completo de la conversación y devuelve la respuesta de Gemini.
   */
  sendMessage: publicProcedure
    .input(z.object({
      messages: z.array(MessageSchema).min(1).max(50),
    }))
    .mutation(async ({ input }) => {
      // Extraer último mensaje del usuario para fuzzy search
      const lastUserMsg = [...input.messages].reverse().find(m => m.role === "user");
      const userQuery = lastUserMsg?.content ?? "";

      // Construir contexto dinámico con fuzzy search del mensaje actual
      const inventoryContext = await buildInventoryContext(userQuery);

      // System prompt con contexto inyectado
      const systemPrompt = `${BASE_SYSTEM_PROMPT}\n${inventoryContext}`;

      // Construir historial de mensajes para Gemini
      const llmMessages = [
        { role: "system" as const, content: systemPrompt },
        ...input.messages.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      const response = await invokeLLM({ messages: llmMessages });

      const content = response?.choices?.[0]?.message?.content;
      if (!content || typeof content !== "string") {
        throw new Error("Respuesta vacía de Gemini");
      }

      return {
        role: "assistant" as const,
        content,
        timestamp: Date.now(),
      };
    }),

  /**
   * Mensaje de bienvenida inicial con datos reales del dashboard.
   */
  welcome: publicProcedure.query(async () => {
    try {
      const kpis = await getDashboardKPIs();
      const stockCero = kpis?.zeroStock ?? 0;
      const ordenesPendientes = kpis?.totalPending ?? 0;

      let welcomeMsg = "¡Hola! Soy **Stock**, tu asistente virtual JIT de Somos Bogotá Usme. 🐾\n\n";

      if (stockCero > 0) {
        welcomeMsg += `📊 En este momento hay **${stockCero} referencias** con stock cero y **${ordenesPendientes} órdenes** pendientes.\n\n`;
      }

      welcomeMsg += "¿En qué te puedo ayudar hoy? Puedo informarte sobre el inventario, órdenes de compra, alertas JIT o cualquier consulta de abastecimiento.";

      return {
        role: "assistant" as const,
        content: welcomeMsg,
        timestamp: Date.now(),
      };
    } catch {
      return {
        role: "assistant" as const,
        content: "¡Hola! Soy **Stock**, tu asistente virtual JIT de Somos Bogotá Usme. ¿En qué puedo ayudarte hoy con el inventario o las órdenes de compra?",
        timestamp: Date.now(),
      };
    }
  }),
});
