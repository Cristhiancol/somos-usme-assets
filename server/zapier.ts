/**
 * server/zapier.ts — Cliente centralizado para Zapier Webhooks
 *
 * Fire-and-forget: nunca bloquea el hilo principal.
 * Si Zapier falla, el sistema sigue funcionando sin errores visibles.
 * El número de WhatsApp SOLO viene de process.env.WHATSAPP_COMPRAS.
 */
import { serverLogger } from "./logger";

// ── Configuración desde variables de entorno ──
const ZAPIER_SECRET = process.env.ZAPIER_WEBHOOK_SECRET ?? "";
const WA_COMPRAS = process.env.WHATSAPP_COMPRAS ?? "";

// URLs de webhooks Zapier (se obtienen al crear cada Zap en zapier.com)
export const ZAPIER_WEBHOOKS = {
  stockCero: process.env.ZAPIER_WEBHOOK_STOCK_CERO ?? "",
  ordenCreada: process.env.ZAPIER_WEBHOOK_ORDEN_CREADA ?? "",
  ordenAprobada: process.env.ZAPIER_WEBHOOK_ORDEN_APROBADA ?? "",
  sincronizacion: process.env.ZAPIER_WEBHOOK_SINCRONIZACION ?? "",
} as const;

// ── Tipos ──
export interface ZapierPayload {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Genera timestamp formateado para Colombia
 */
function getColombiaTimestamp(): string {
  return new Date().toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Envía un payload a un webhook de Zapier.
 * Fire-and-forget: no bloquea, no lanza excepciones.
 * Retorna true si el envío fue exitoso, false si falló o no está configurado.
 */
export async function notificarZapier(
  webhookUrl: string | undefined,
  payload: ZapierPayload
): Promise<boolean> {
  if (!webhookUrl || !ZAPIER_SECRET) {
    serverLogger.debug("[Zapier] Webhook no configurado, omitiendo notificación");
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Zapier-Secret": ZAPIER_SECRET,
      },
      body: JSON.stringify({
        ...payload,
        whatsapp_destino: WA_COMPRAS,
        sistema: "Somos Bogotá Usme — Asset Tracker",
        timestamp: getColombiaTimestamp(),
      }),
    });

    if (response.ok) {
      serverLogger.log(`[Zapier] Webhook enviado: ${payload.evento}`);
      return true;
    } else {
      serverLogger.warn(`[Zapier] Webhook respondió ${response.status}: ${payload.evento}`);
      return false;
    }
  } catch (error) {
    // Silencioso — Zapier no puede tumbar el sistema principal
    serverLogger.warn("[Zapier] Error enviando webhook (silenciado):", error);
    return false;
  }
}

// ── Funciones de alto nivel para cada evento ──

/**
 * Notifica stock cero de una referencia
 */
export function notificarStockCero(item: {
  referencia: string;
  descripcion: string | null;
  categoria?: string | null;
  proveedor?: string | null;
  costoUnitario?: number;
  parteFabricante?: string | null;
}): void {
  const hora = getColombiaTimestamp();
  // Fire and forget — no await
  notificarZapier(ZAPIER_WEBHOOKS.stockCero, {
    evento: "STOCK_CERO",
    referencia: item.referencia,
    descripcion: item.descripcion ?? "Sin descripción",
    categoria: item.categoria ?? "N/A",
    proveedor_nombre: item.proveedor ?? "Sin proveedor asignado",
    parte_fabricante: item.parteFabricante ?? "N/A",
    costo_unitario: item.costoUnitario ?? 0,
    mensaje_whatsapp: [
      `🚨 *ALERTA STOCK CERO*`,
      ``,
      `📦 Referencia: *${item.referencia}*`,
      `📝 ${item.descripcion ?? "Sin descripción"}`,
      `🏭 Proveedor: ${item.proveedor ?? "Sin asignar"}`,
      `🔧 PF: ${item.parteFabricante ?? "N/A"}`,
      `💰 Costo: $${(item.costoUnitario ?? 0).toLocaleString("es-CO")} COP`,
      ``,
      `⏰ ${hora}`,
      `📍 Somos Bogotá Usme — Asset Tracker`,
    ].join("\n"),
  }).catch(() => {});
}

/**
 * Notifica nueva orden de compra creada
 */
export function notificarOrdenCreada(orden: {
  numero: string;
  proveedor?: { nombre?: string; nit?: string };
  valorTotal?: number;
  items?: Array<{ referencia: string; descripcion: string; cantidad: number }>;
}): void {
  const hora = getColombiaTimestamp();
  const itemsTexto = (orden.items ?? [])
    .map((i) => `  • ${i.referencia}: ${i.descripcion} ×${i.cantidad}`)
    .join("\n");
  const valorFormato = `$${(orden.valorTotal ?? 0).toLocaleString("es-CO")} COP`;

  notificarZapier(ZAPIER_WEBHOOKS.ordenCreada, {
    evento: "ORDEN_CREADA",
    numero_oc: orden.numero,
    proveedor_nombre: orden.proveedor?.nombre ?? "N/A",
    proveedor_nit: orden.proveedor?.nit ?? "N/A",
    valor_total: valorFormato,
    total_items: orden.items?.length ?? 0,
    mensaje_whatsapp: [
      `📦 *NUEVA ORDEN DE COMPRA*`,
      ``,
      `🔢 OC Número: *#${orden.numero}*`,
      `🏭 Proveedor: ${orden.proveedor?.nombre ?? "N/A"}`,
      `🪪 NIT: ${orden.proveedor?.nit ?? "N/A"}`,
      `💰 Valor total: *${valorFormato}*`,
      `📋 Items (${orden.items?.length ?? 0}):`,
      itemsTexto || "  Sin detalle",
      ``,
      `⏰ ${hora}`,
      `📍 Somos Bogotá Usme — Asset Tracker`,
    ].join("\n"),
  }).catch(() => {});
}

/**
 * Notifica orden de compra aprobada
 */
export function notificarOrdenAprobada(orden: {
  numero: string;
  proveedor?: { nombre?: string };
  valorTotal?: number;
  fechaEntregaEstimada?: string;
  aprobadoPor?: string;
}): void {
  const hora = getColombiaTimestamp();
  const valorFormato = `$${(orden.valorTotal ?? 0).toLocaleString("es-CO")} COP`;

  notificarZapier(ZAPIER_WEBHOOKS.ordenAprobada, {
    evento: "ORDEN_APROBADA",
    numero_oc: orden.numero,
    proveedor_nombre: orden.proveedor?.nombre ?? "N/A",
    valor_total: valorFormato,
    fecha_entrega: orden.fechaEntregaEstimada ?? "Por confirmar",
    aprobado_por: orden.aprobadoPor ?? "Sistema",
    mensaje_whatsapp: [
      `✅ *ORDEN DE COMPRA APROBADA*`,
      ``,
      `🔢 OC Número: *#${orden.numero}*`,
      `🏭 Proveedor: ${orden.proveedor?.nombre ?? "N/A"}`,
      `💰 Valor: *${valorFormato}*`,
      `📅 Entrega estimada: *${orden.fechaEntregaEstimada ?? "Por confirmar"}*`,
      `👤 Aprobado por: ${orden.aprobadoPor ?? "Sistema"}`,
      ``,
      `⏰ ${hora}`,
      `📍 Somos Bogotá Usme — Asset Tracker`,
    ].join("\n"),
  }).catch(() => {});
}

/**
 * Notifica sincronización completada
 */
export function notificarSincronizacion(stats: {
  registrosActualizados: number;
  registrosNuevos: number;
  ordenes: number;
  proveedores: number;
  errores?: number;
  duracionSegundos?: number;
  stockCeroDetectados?: number;
}): void {
  const hora = getColombiaTimestamp();
  const hayErrores = (stats.errores ?? 0) > 0;

  notificarZapier(ZAPIER_WEBHOOKS.sincronizacion, {
    evento: "SINCRONIZACION_COMPLETADA",
    registros_actualizados: stats.registrosActualizados,
    registros_nuevos: stats.registrosNuevos,
    ordenes: stats.ordenes,
    proveedores: stats.proveedores,
    errores: stats.errores ?? 0,
    duracion_segundos: stats.duracionSegundos ?? 0,
    stock_cero_detectados: stats.stockCeroDetectados ?? 0,
    mensaje_whatsapp: [
      `🔄 *SINCRONIZACIÓN COMPLETADA*`,
      ``,
      `📦 Referencias: *${stats.registrosActualizados}*`,
      `📋 Órdenes: *${stats.ordenes}*`,
      `🏭 Proveedores: *${stats.proveedores}*`,
      stats.stockCeroDetectados
        ? `🚨 Stock cero detectados: *${stats.stockCeroDetectados}*`
        : `✅ Sin nuevos stock cero`,
      hayErrores
        ? `⚠️ Errores detectados: *${stats.errores}* — revisar logs`
        : `✅ Sin errores`,
      stats.duracionSegundos
        ? `⏱️ Duración: ${stats.duracionSegundos}s`
        : "",
      ``,
      `⏰ ${hora}`,
      `📍 Somos Bogotá Usme — Asset Tracker`,
    ]
      .filter(Boolean)
      .join("\n"),
  }).catch(() => {});
}

/**
 * Verifica si Zapier está configurado (al menos un webhook + secret)
 */
export function isZapierConfigured(): boolean {
  return !!(
    ZAPIER_SECRET &&
    (ZAPIER_WEBHOOKS.stockCero ||
      ZAPIER_WEBHOOKS.ordenCreada ||
      ZAPIER_WEBHOOKS.ordenAprobada ||
      ZAPIER_WEBHOOKS.sincronizacion)
  );
}
