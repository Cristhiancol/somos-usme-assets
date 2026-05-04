/**
 * Router del Chatbot "Stock" v3.0 — Asistente Virtual JIT
 * Integra Gemini AI con:
 * - Contexto dinámico completo (KPIs, alertas JIT, OC con esperados, proveedores)
 * - Fuzzy search con fuse.js para corrección de referencias
 * - EOQ: cantidadAPedir, puntoReorden, stockSeguridad
 * - Top 20 mayor valor (costoUnitario × stockActual)
 * - Servicios SRV filtrados
 * - Valor unitario y parte fabricante en cada referencia
 */
import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";
import { serverLogger } from "../logger";
import {
  getDashboardKPIs,
  getJITAlerts,
  getPurchaseOrders,
  getStockCeroConOC,
  getInventory,
  getSuppliers,
  getTopConsumers,
  getConsumoByMonth,
  getConsumoMensual,
} from "../db";
import Fuse from "fuse.js";

// ── Tipos para el catálogo fuzzy ────────────────────────────────────────────
interface CatalogItem {
  referencia: string;
  descripcion: string;
  parteFabricante: string | null;
  stockActual: number;
  costoUnitario: number;
  totalStock: number;
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
  stockSeguridad: number;
  puntoPedido: number;
  minimo: number;
  maximo: number;
  accionRequerida: string | null;
  prioridad: string | null;
  valorAPedir: number;
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
      totalStock: i.totalStock ?? 0,
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
      stockSeguridad: i.stockSeguridad ?? 0,
      puntoPedido: i.puntoPedido ?? 0,
      minimo: i.minimo ?? 0,
      maximo: i.maximo ?? 0,
      accionRequerida: i.accionRequerida ?? null,
      prioridad: i.prioridad ?? null,
      valorAPedir: i.valorAPedir ?? 0,
    }));
    catalogCacheTime = Date.now();
  } catch (e) {
    serverLogger.error("[Chatbot] Error cargando catálogo:", e);
  }
  return catalogCache;
}

// ── Fuzzy search (incluye valorUnitario, PF, EOQ) ──────────────────────────
async function fuzzySearch(query: string): Promise<string> {
  const catalog = await getCatalog();
  if (catalog.length === 0) return "";

  const fuse = new Fuse(catalog, {
    keys: [
      { name: "referencia", weight: 0.35 },
      { name: "descripcion", weight: 0.35 },
      { name: "parteFabricante", weight: 0.15 },
      { name: "proveedor", weight: 0.15 },
    ],
    threshold: 0.45,
    includeScore: true,
    minMatchCharLength: 3,
  });

  const results = fuse.search(query).slice(0, 8);
  if (results.length === 0) return "";

  const lines = results.map((r, i) => {
    const item = r.item;
    const score = Math.round((1 - (r.score ?? 0)) * 100);
    const valorTotal = (item.costoUnitario * item.stockActual);
    return `  ${i + 1}. Ref: ${item.referencia} | ${item.descripcion}
     PF: ${item.parteFabricante ?? "N/A"} | UM: ${item.umEmision ?? "UND"} | Clase: ${item.claseAbc ?? "N/A"}
     Stock: ${item.stockActual} | Costo Unitario: $${item.costoUnitario.toLocaleString("es-CO")} COP | Valor Total: $${valorTotal.toLocaleString("es-CO")} COP
     Proveedor: ${item.proveedor ?? "N/A"} | Estado: ${item.estado ?? "N/A"} | Prioridad: ${item.prioridad ?? "N/A"}
     Consumo diario: ${item.consumoDiario} | Lead time: ${item.leadTimeDias}d | Punto reorden: ${item.puntoReorden}
     Stock seguridad: ${item.stockSeguridad} | Cantidad a pedir: ${item.cantidadAPedir} | Valor a pedir: $${item.valorAPedir.toLocaleString("es-CO")} COP
     Acción: ${item.accionRequerida ?? "N/A"} | Score: ${score}%`;
  });

  // Buscar consumo mensual de la primera referencia encontrada
  let consumoSection = "";
  if (results.length > 0) {
    const topRef = results[0].item.referencia;
    try {
      const consumoData = await getConsumoMensual(topRef);
      if (consumoData.length > 0) {
        const totalConsumo = consumoData.reduce((s, c) => s + c.cantidad, 0);
        const mesesActivos = consumoData.filter(c => c.cantidad > 0).length;
        const promedioMes = mesesActivos > 0 ? totalConsumo / mesesActivos : 0;
        const consumoLineas = consumoData.map(c => `${c.mes}: ${c.cantidad}`).join(" | ");
        
        // Calcular tendencia
        const sorted = consumoData.sort((a, b) => a.mes.localeCompare(b.mes));
        const total = sorted.length;
        const splitAt = Math.max(0, total - 3);
        const recientes = sorted.slice(splitAt);
        const anteriores = sorted.slice(0, splitAt);
        const avgRec = recientes.length > 0 ? recientes.reduce((s, m) => s + m.cantidad, 0) / recientes.length : 0;
        const avgAnt = anteriores.length > 0 ? anteriores.reduce((s, m) => s + m.cantidad, 0) / anteriores.length : 0;
        const tendencia = avgAnt > 0 ? ((avgRec - avgAnt) / avgAnt) * 100 : 0;
        const tendenciaStr = tendencia > 10 ? `↑ SUBIENDO ${tendencia.toFixed(0)}%` : tendencia < -10 ? `↓ BAJANDO ${Math.abs(tendencia).toFixed(0)}%` : "→ ESTABLE";

        consumoSection = `\n\n[CONSUMO_REFERENCIA] Historial de consumo mensual de ${topRef}:
  Fabricante: ${consumoData[0].fabricante ?? "N/A"}
  Total consumido: ${totalConsumo.toLocaleString("es-CO")} unidades
  Promedio/mes: ${promedioMes.toFixed(1)} | Meses activos: ${mesesActivos} de ${total}
  Tendencia: ${tendenciaStr}
  Detalle: ${consumoLineas}`;
      }
    } catch (e) {
      // Silencioso
    }
  }

  return `\n[SUGERENCIAS_FUZZY] (coincidencias para "${query}"):\n${lines.join("\n\n")}${consumoSection}`;
}

// ── System Prompt base de Stock v3.0 ────────────────────────────────────────
const BASE_SYSTEM_PROMPT = `Eres "Stock", el asistente virtual experto en logística JIT del sistema de gestión de flota de Somos Bogotá Usme (empresa de transporte público de Bogotá, Colombia con 260 buses).

PERSONALIDAD:
- Directo, técnico, eficiente
- Español colombiano neutro y profesional
- Usas emojis con moderación: 📦 para inventario, 🚨 para alertas críticas, ✅ para confirmaciones, 💰 para costos
- NUNCA te llamas a ti mismo con otro nombre que no sea "Stock"

CAPACIDADES:
- Consultas de inventario con datos reales en tiempo real
- Valor unitario y valor total de cada referencia
- Parte fabricante (PF) de cada referencia
- Cálculo de cantidad a pedir (EOQ, punto de reorden, stock de seguridad)
- Detalle completo de órdenes de compra: pedido, recibido, pendiente, % cumplimiento, valor
- Información de servicios (UM=SRV) con detalle
- Top 20 referencias de mayor valor en inventario
- Información de proveedores
- Corrección de referencias mal escritas (fuzzy search)
- **Análisis de consumo mensual y tendencias de demanda**
- **Alertas de riesgo de desabastecimiento**
- **Recomendaciones de compra basadas en tendencias**

REGLAS ESTRICTAS:
1. Solo proporciona datos que estén en el contexto del sistema. NO inventes stocks, precios ni referencias.
2. Si no tienes el dato, di: "No tengo esa información en este momento. Consulta directamente en el módulo correspondiente del dashboard."
3. Responde siempre en español colombiano.
4. Mensajes concisos: máximo 200 palabras por respuesta salvo que el usuario pida detalle o listados.

INSTRUCCIONES POR TIPO DE CONSULTA:

📦 CUANDO PREGUNTEN POR UNA REFERENCIA:
- Incluir SIEMPRE: referencia, descripción, parte fabricante (PF), stock actual, costo unitario, valor total (stock × costo), UM, clase ABC, estado, proveedor.
- Si stock=0, indicar si hay OC activa y cuándo se espera recibir.
- **Si hay datos de consumo mensual [CONSUMO_REFERENCIA], incluir: total consumido, promedio/mes, tendencia (subiendo/bajando/estable), y desglose mensual.**
- Ejemplo: "Esta referencia ha consumido 420 unidades en 8 meses (promedio 52.5/mes, tendencia ↑ SUBIENDO 35%)"

💰 CUANDO PREGUNTEN "CUÁNTO CUESTA" o "VALOR":
- Mostrar costo unitario Y valor total en inventario (stock × costoUnitario).
- Formato: $XXX.XXX COP

🛒 CUANDO PREGUNTEN "CUÁNTO COMPRAR" o "NECESITO PEDIR":
- Usar los campos: cantidadAPedir, puntoReorden, stockSeguridad, consumoDiario, leadTimeDias.
- Mostrar: "Se recomienda pedir X unidades" con la justificación (consumo diario × lead time + stock seguridad).
- Si cantidadAPedir > 0, mostrar también el valor estimado a pedir (valorAPedir).
- Aclarar que es un estimado basado en historial y parámetros JIT.

📋 CUANDO PREGUNTEN POR UNA OC (orden de compra):
- Incluir SIEMPRE: número OC, descripción, proveedor, parte fabricante, qty pedida, qty recibida, qty pendiente, % cumplimiento, costo unitario, valor pendiente, estado, días de retraso, prioridad.

🔧 CUANDO PREGUNTEN POR SERVICIOS:
- Filtrar y mostrar solo las OC con UM='SRV' del contexto [SERVICIOS_SRV].
- Incluir: OC, descripción, proveedor, valor, estado, días retraso.

📊 CUANDO PREGUNTEN "TOP 20 MAYOR VALOR" o "MÁS COSTOSAS":
- Usar la sección [TOP_20_MAYOR_VALOR] del contexto.
- Mostrar tabla: referencia, descripción, stock, costo unitario, valor total, clase ABC.

🏭 CUANDO PREGUNTEN POR PARTE FABRICANTE o PF:
- Buscar en las sugerencias fuzzy o en el contexto.
- Mostrar: referencia, descripción, parte fabricante, proveedor.

4. Cuando detectes sugerencias fuzzy en el contexto [SUGERENCIAS_FUZZY], presenta las opciones al usuario antes de dar información de stock u órdenes.
5. Cuando informes sobre una referencia con stock cero, incluye:
   - Stock actual, consumo promedio, lead time del proveedor
   - Cantidad estimada a pedir y punto de reorden
   - Urgencia: CRÍTICA / ALTA / NORMAL
6. Cuando informes sobre una OC, incluye: número, proveedor, estado, ítems, valor, días de retraso.

📈 CUANDO PREGUNTEN "TENDENCIAS" o "CONSUMO":
- Usar la sección [CONSUMO_TENDENCIAS] del contexto.
- Informar cuáles referencias tienen consumo creciente, decreciente o sin rotación.
- Cruzar con stock actual para recomendar acciones de compra.

⚠ CUANDO PREGUNTEN "QUÉ COMPRAR" o "PRIORIDAD DE COMPRA":
- Combinar datos de [NECESITAN_COMPRA] con [CONSUMO_TENDENCIAS].
- Priorizar: consumo creciente + stock bajo = COMPRAR PRIMERO.
- Consumo decreciente + stock alto = NO COMPRAR / EVALUAR.`;

// ── Construir contexto dinámico enriquecido v3.0 ───────────────────────────
async function buildInventoryContext(userMessage: string): Promise<string> {
  try {
    const [kpis, alerts, criticalOrders, ordersData, suppliersData, catalog, fuzzyResults, topConsumo, consumoMeses] = await Promise.all([
      getDashboardKPIs(),
      getJITAlerts(),
      getStockCeroConOC(),
      getPurchaseOrders({ tipoReferencia: undefined }),
      getSuppliers(),
      getCatalog(),
      fuzzySearch(userMessage),
      getTopConsumers(15),
      getConsumoByMonth(),
    ]);

    const alertSummary = alerts
      ? `CRITICO: ${(alerts as any).critico ?? (alerts as any).CRITICO ?? 0}, REORDEN: ${(alerts as any).reorden ?? (alerts as any).REORDEN ?? 0}, PRECAUCION: ${(alerts as any).precaucion ?? (alerts as any).PRECAUCION ?? 0}, OPTIMO: ${(alerts as any).optimo ?? (alerts as any).OPTIMO ?? 0}`
      : "No disponible";

    // Top 10 referencias críticas con EOQ y valor
    const topCritical = criticalOrders.slice(0, 10).map((o: any) =>
      `  - Ref: ${o.referencia} | OC: ${o.ordenCompra} | ${o.diasRetraso}d retraso | Proveedor: ${o.proveedorOC ?? o.proveedorInventario ?? "N/A"} | PF: ${o.parteFabricante ?? "N/A"}`
    ).join("\n");

    // Top 20 OC con datos ESPERADOS completos (pedido, recibido, pendiente, %, valor)
    const topOrders = (ordersData as any[]).slice(0, 20).map((o: any) => {
      const cumpl = o.cumplimiento != null ? `${Math.round(o.cumplimiento)}%` : "N/A";
      const valorPend = o.valorPendiente != null ? `$${Number(o.valorPendiente).toLocaleString("es-CO")}` : `$${(o.costoUnitario * o.qtyPendiente).toLocaleString("es-CO")}`;
      return `  - OC: ${o.ordenCompra} | ${o.descripcion} | PF: ${o.parteFabricante ?? "N/A"} | UM: ${o.um ?? "UND"}
    Proveedor: ${o.proveedor ?? "N/A"} | Pedido: ${o.qtyOrdenada} | Recibido: ${o.qtyRecibida} | Pendiente: ${o.qtyPendiente} | Cumpl: ${cumpl}
    Costo Unit: $${Number(o.costoUnitario).toLocaleString("es-CO")} COP | Valor Pend: ${valorPend} COP | Estado: ${o.estado} | Retraso: ${o.diasRetraso}d | Prioridad: ${o.prioridad ?? "N/A"}`;
    }).join("\n");

    // Servicios SRV (filtrar OC con UM='SRV')
    const serviciosSRV = (ordersData as any[])
      .filter((o: any) => o.um === "SRV")
      .slice(0, 15)
      .map((o: any) => {
        const valorPend = o.valorPendiente != null ? `$${Number(o.valorPendiente).toLocaleString("es-CO")}` : `$${(o.costoUnitario * o.qtyPendiente).toLocaleString("es-CO")}`;
        return `  - OC: ${o.ordenCompra} | ${o.descripcion} | Proveedor: ${o.proveedor ?? "N/A"} | Valor: ${valorPend} COP | Estado: ${o.estado} | Retraso: ${o.diasRetraso}d`;
      }).join("\n");
    const totalSRV = (ordersData as any[]).filter((o: any) => o.um === "SRV").length;

    // Top 20 referencias de mayor valor (totalStock = costoUnitario × stockActual)
    const top20Valor = [...catalog]
      .sort((a, b) => (b.totalStock || (b.costoUnitario * b.stockActual)) - (a.totalStock || (a.costoUnitario * a.stockActual)))
      .slice(0, 20)
      .map((item, i) => {
        const valorTotal = item.totalStock || (item.costoUnitario * item.stockActual);
        return `  ${i + 1}. Ref: ${item.referencia} | ${item.descripcion} | PF: ${item.parteFabricante ?? "N/A"}
     Stock: ${item.stockActual} ${item.umEmision ?? "UND"} | Costo Unit: $${item.costoUnitario.toLocaleString("es-CO")} COP | Valor Total: $${valorTotal.toLocaleString("es-CO")} COP | Clase: ${item.claseAbc ?? "N/A"}`;
      }).join("\n");

    // Top 10 proveedores
    const topSuppliers = (suppliersData as any[]).slice(0, 10).map((s: any) =>
      `  - ${s.nombre} | NIT: ${s.nit ?? "N/A"} | Email: ${s.email ?? "N/A"} | Tel: ${s.telefono ?? "N/A"}`
    ).join("\n");

    // Referencias con cantidadAPedir > 0 (necesitan compra)
    const necesitanCompra = catalog
      .filter(item => item.cantidadAPedir > 0)
      .sort((a, b) => b.valorAPedir - a.valorAPedir)
      .slice(0, 15)
      .map((item, i) => {
        return `  ${i + 1}. Ref: ${item.referencia} | ${item.descripcion}
     Stock: ${item.stockActual} | Consumo diario: ${item.consumoDiario} | Lead time: ${item.leadTimeDias}d
     Punto reorden: ${item.puntoReorden} | Stock seguridad: ${item.stockSeguridad}
     Cantidad a pedir: ${item.cantidadAPedir} ${item.umEmision ?? "UND"} | Valor a pedir: $${item.valorAPedir.toLocaleString("es-CO")} COP
     Proveedor: ${item.proveedor ?? "N/A"} | Estado: ${item.estado ?? "N/A"} | Prioridad: ${item.prioridad ?? "N/A"}`;
      }).join("\n");

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

[REFERENCIAS_CRITICAS] Top 10 (stock=0 con OC pendiente):
${topCritical || "  (Sin referencias críticas actualmente)"}

[ORDENES_PENDIENTES] Top 20 OC con datos esperados completos:
${topOrders || "  (Sin órdenes pendientes)"}

[SERVICIOS_SRV] ${totalSRV} servicios pendientes (UM=SRV):
${serviciosSRV || "  (Sin servicios pendientes)"}

[TOP_20_MAYOR_VALOR] Referencias con mayor valor en inventario:
${top20Valor || "  (Sin datos de inventario)"}

[NECESITAN_COMPRA] Top 15 referencias que necesitan pedido (cantidadAPedir > 0):
${necesitanCompra || "  (Sin referencias que necesiten compra)"}

[PROVEEDORES] Top 10:
${topSuppliers || "  (Sin proveedores registrados)"}

[CONSUMO_TENDENCIAS] Top 15 referencias más consumidas (acumulado mensual):
${(topConsumo || []).map((tc: any, i: number) => 
  `  ${i + 1}. Ref: ${tc.referencia} | ${tc.descripcion ?? "N/A"} | PF: ${tc.fabricante ?? "N/A"}
     Total consumido: ${Number(tc.totalConsumo).toLocaleString("es-CO")} | Promedio/mes: ${Number(tc.promedioMes).toFixed(1)} | Meses activos: ${tc.mesesConConsumo}`
).join("\n") || "  (Sin datos de consumo)"}

[CONSUMO_MENSUAL_TOTAL] Consumo total por mes:
${(consumoMeses || []).map((m: any) => 
  `  ${m.mes}: ${Number(m.totalConsumo).toLocaleString("es-CO")} unidades (${m.refsActivas} refs activas)`
).join("\n") || "  (Sin datos de consumo mensual)"}
${fuzzyResults}
===`;
  } catch (e) {
    serverLogger.error("[Chatbot] Error obteniendo contexto:", e);
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
      const urgentes = kpis?.urgentOrders ?? 0;
      const valorTotal = kpis?.totalValue ?? 0;

      let welcomeMsg = "¡Hola! Soy **Stock**, tu asistente virtual JIT de Somos Bogotá Usme. 🐾\n\n";

      if (stockCero > 0) {
        welcomeMsg += `📊 **Estado actual:**\n`;
        welcomeMsg += `- **${stockCero}** referencias con stock cero\n`;
        welcomeMsg += `- **${ordenesPendientes}** órdenes pendientes (${urgentes} urgentes)\n`;
        welcomeMsg += `- Valor inventario: **$${valorTotal.toLocaleString("es-CO")} COP**\n\n`;
      }

      welcomeMsg += "Puedo ayudarte con:\n";
      welcomeMsg += "• 📦 Consultar stock, valor y parte fabricante de cualquier referencia\n";
      welcomeMsg += "• 🛒 Calcular cuánto comprar de una referencia\n";
      welcomeMsg += "• 📋 Estado detallado de órdenes de compra (pedido/recibido/pendiente)\n";
      welcomeMsg += "• 🔧 Servicios pendientes (SRV)\n";
      welcomeMsg += "• 💰 Top 20 referencias de mayor valor\n\n";
      welcomeMsg += "¿En qué te puedo ayudar?";

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
