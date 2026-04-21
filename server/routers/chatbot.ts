/**
 * Router del Chatbot "Stock" — Asistente Virtual JIT
 * Integra Gemini AI con contexto dinámico de inventario en tiempo real.
 * Cada mensaje inyecta KPIs actuales, alertas y órdenes críticas.
 */
import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";
import { getDashboardKPIs, getJITAlerts, getPurchaseOrders, getStockCeroConOC } from "../db";

// ── System Prompt base de Stock ──────────────────────────────────────────────
const BASE_SYSTEM_PROMPT = `Eres "Stock", el asistente virtual experto del sistema Asset Tracker de Somos Bogotá Usme.

IDENTIDAD:
- Tu nombre es Stock (no "cota" ni ningún otro nombre)
- Eres un experto en logística, gestión de cadena de suministro y control de inventario JIT
- Trabajas para Somos Bogotá Usme, empresa que gestiona una flota de 260 buses de Transmilenio
- Tienes acceso en tiempo real al inventario de 1.828 referencias de repuestos vehiculares

PERSONALIDAD Y ESTILO:
- Responde en español colombiano, directo y técnico
- Sé conciso pero completo — máximo 3 párrafos por respuesta
- Usa términos técnicos de cadena de suministro cuando sea apropiado
- Muestra empatía ante situaciones críticas (stock cero, retrasos graves)
- Cuando hay datos reales disponibles, úsalos siempre

CAPACIDADES:
- Consultar estado del inventario (stock, clasificación ABC, alertas JIT)
- Informar sobre órdenes de compra pendientes y retrasos
- Identificar referencias en riesgo de desabastecimiento
- Explicar métricas del dashboard (valor inventario, cumplimiento OC, etc.)
- Dar recomendaciones de gestión de inventario JIT
- Responder preguntas sobre proveedores y tiempos de entrega

RESTRICCIONES:
- Solo responde sobre temas relacionados con el inventario, logística y la operación de Somos Usme
- No inventes datos — si no tienes información, dilo claramente
- No hagas promesas sobre acciones que no puedes ejecutar directamente`;

// ── Construir contexto dinámico desde la BD ───────────────────────────────────
async function buildInventoryContext(): Promise<string> {
  try {
    const [kpis, alerts, criticalOrders] = await Promise.all([
      getDashboardKPIs(),
      getJITAlerts(),
      getStockCeroConOC(),
    ]);

    const alertSummary = alerts
      ? `CRITICO: ${(alerts as any).critico ?? (alerts as any).CRITICO ?? 0}, REORDEN: ${(alerts as any).reorden ?? (alerts as any).REORDEN ?? 0}, PRECAUCION: ${(alerts as any).precaucion ?? (alerts as any).PRECAUCION ?? 0}, OPTIMO: ${(alerts as any).optimo ?? (alerts as any).OPTIMO ?? 0}`
      : 'No disponible';

    const topCritical = criticalOrders.slice(0, 5).map(o =>
      `  - ${o.referencia} | OC: ${o.ordenCompra} | ${o.diasRetraso}d retraso | ${o.proveedorOC ?? o.proveedorInventario ?? 'N/A'}`
    ).join('\n');

    return `
=== CONTEXTO EN TIEMPO REAL (${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}) ===

INVENTARIO GENERAL:
- Total referencias: ${kpis?.totalRefs ?? 'N/A'}
- Valor total inventario: $${kpis?.totalValue?.toLocaleString('es-CO') ?? 'N/A'} COP
- Referencias stock CERO: ${kpis?.zeroStock ?? 'N/A'}
- Órdenes pendientes: ${kpis?.totalPending ?? 'N/A'}
- Stock 0 con OC activa: ${kpis?.stockCeroConOC ?? 'N/A'}

ALERTAS JIT:
${alertSummary}

TOP 5 REFERENCIAS CRÍTICAS (stock=0 con OC pendiente):
${topCritical || '  (Sin referencias críticas actualmente)'}
===`;
  } catch (e) {
    console.error('[Chatbot] Error obteniendo contexto:', e);
    return '\n=== CONTEXTO: No disponible temporalmente ===\n';
  }
}

// ── Schema de mensaje ─────────────────────────────────────────────────────────
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
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
      // Construir contexto dinámico de inventario
      const inventoryContext = await buildInventoryContext();

      // System prompt con contexto inyectado
      const systemPrompt = `${BASE_SYSTEM_PROMPT}\n${inventoryContext}`;

      // Construir historial de mensajes para Gemini
      const llmMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...input.messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      const response = await invokeLLM({ messages: llmMessages });

      const content = response?.choices?.[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        throw new Error('Respuesta vacía de Gemini');
      }

      return {
        role: 'assistant' as const,
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

      let welcomeMsg = '¡Hola! Soy **Stock**, tu asistente virtual JIT de Somos Bogotá Usme. 🐾\n\n';

      if (stockCero > 0) {
        welcomeMsg += `📊 En este momento hay **${stockCero} referencias** con stock cero y **${ordenesPendientes} órdenes** pendientes.\n\n`;
      }

      welcomeMsg += '¿En qué te puedo ayudar hoy? Puedo informarte sobre el inventario, órdenes de compra, alertas JIT o cualquier consulta de abastecimiento.';

      return {
        role: 'assistant' as const,
        content: welcomeMsg,
        timestamp: Date.now(),
      };
    } catch {
      return {
        role: 'assistant' as const,
        content: '¡Hola! Soy **Stock**, tu asistente virtual JIT de Somos Bogotá Usme. ¿En qué puedo ayudarte hoy con el inventario o las órdenes de compra?',
        timestamp: Date.now(),
      };
    }
  }),
});
