/**
 * Consumo Router — Análisis de consumo mensual por referencia
 * Endpoints para tendencias, alertas de abastecimiento y top consumidores
 */
import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  getConsumoMensual,
  getConsumoSummary,
  getTopConsumers,
  getConsumoByMonth,
  getInventory,
} from "../db";

export const consumoRouter = router({
  /** Resumen general de consumo */
  summary: publicProcedure.query(async () => {
    return getConsumoSummary();
  }),

  /** Consumo total por mes (para gráfico de barras) */
  byMonth: publicProcedure.query(async () => {
    return getConsumoByMonth();
  }),

  /** Top N referencias más consumidas */
  topConsumers: publicProcedure
    .input(z.object({ limit: z.number().optional().default(20) }).optional())
    .query(async ({ input }) => {
      return getTopConsumers(input?.limit ?? 20);
    }),

  /** Consumo mensual de una referencia específica */
  byRef: publicProcedure
    .input(z.object({ referencia: z.string() }))
    .query(async ({ input }) => {
      return getConsumoMensual(input.referencia);
    }),

  /**
   * Alertas inteligentes de abastecimiento
   * Cruza consumo mensual con inventario actual para detectar riesgos
   */
  alerts: publicProcedure.query(async () => {
    const consumoData = await getConsumoMensual();
    const { items: inventory } = await getInventory({ limit: 5000 });

    // Agrupar consumo por referencia
    const consumoByRef: Record<string, { meses: { mes: string; qty: number }[]; descripcion: string | null; fabricante: string | null }> = {};
    for (const c of consumoData) {
      if (!consumoByRef[c.referencia]) {
        consumoByRef[c.referencia] = { meses: [], descripcion: c.descripcion, fabricante: c.fabricante };
      }
      consumoByRef[c.referencia].meses.push({ mes: c.mes, qty: c.cantidad });
    }

    // Mapa de inventario por referencia
    const invMap: Record<string, any> = {};
    for (const inv of inventory) {
      if (inv.referencia) invMap[inv.referencia] = inv;
    }

    // Ordenar meses y calcular tendencias
    const alerts: {
      referencia: string;
      descripcion: string | null;
      fabricante: string | null;
      tipo: string;
      color: string;
      mensaje: string;
      stockActual: number;
      consumoReciente: number;
      consumoAnterior: number;
      tendenciaPct: number;
    }[] = [];

    for (const [ref, data] of Object.entries(consumoByRef)) {
      const sorted = data.meses.sort((a, b) => a.mes.localeCompare(b.mes));
      if (sorted.length < 2) continue;

      const inv = invMap[ref];
      const stock = inv?.stockActual ?? 0;
      const puntoReorden = inv?.puntoReorden ?? 0;

      // Últimos 3 meses vs anteriores
      const total = sorted.length;
      const splitAt = Math.max(0, total - 3);
      const recientes = sorted.slice(splitAt);
      const anteriores = sorted.slice(0, splitAt);

      const avgReciente = recientes.length > 0 ? recientes.reduce((s, m) => s + m.qty, 0) / recientes.length : 0;
      const avgAnterior = anteriores.length > 0 ? anteriores.reduce((s, m) => s + m.qty, 0) / anteriores.length : 0;

      const tendencia = avgAnterior > 0 ? ((avgReciente - avgAnterior) / avgAnterior) * 100 : (avgReciente > 0 ? 100 : 0);

      // Consumo total reciente
      const consumoRecienteTotal = recientes.reduce((s, m) => s + m.qty, 0);
      const sinRotacion = recientes.every(m => m.qty === 0) && stock > 0;

      // Clasificar alerta
      if (tendencia > 30 && stock <= puntoReorden && consumoRecienteTotal > 0) {
        alerts.push({
          referencia: ref,
          descripcion: data.descripcion,
          fabricante: data.fabricante,
          tipo: "RIESGO_DESABASTECIMIENTO",
          color: "#DC2626",
          mensaje: `Consumo ↑${tendencia.toFixed(0)}% y stock (${stock}) bajo punto de reorden (${puntoReorden})`,
          stockActual: stock,
          consumoReciente: avgReciente,
          consumoAnterior: avgAnterior,
          tendenciaPct: tendencia,
        });
      } else if (tendencia > 30 && consumoRecienteTotal > 0) {
        alerts.push({
          referencia: ref,
          descripcion: data.descripcion,
          fabricante: data.fabricante,
          tipo: "DEMANDA_EN_AUMENTO",
          color: "#F97316",
          mensaje: `Consumo creciente ↑${tendencia.toFixed(0)}%, promedio reciente: ${avgReciente.toFixed(1)}/mes`,
          stockActual: stock,
          consumoReciente: avgReciente,
          consumoAnterior: avgAnterior,
          tendenciaPct: tendencia,
        });
      } else if (sinRotacion) {
        alerts.push({
          referencia: ref,
          descripcion: data.descripcion,
          fabricante: data.fabricante,
          tipo: "SIN_ROTACION",
          color: "#EAB308",
          mensaje: `Sin consumo en últimos ${recientes.length} meses con stock=${stock}. Evaluar obsolescencia`,
          stockActual: stock,
          consumoReciente: 0,
          consumoAnterior: avgAnterior,
          tendenciaPct: -100,
        });
      } else if (tendencia < -30 && avgAnterior > 0) {
        alerts.push({
          referencia: ref,
          descripcion: data.descripcion,
          fabricante: data.fabricante,
          tipo: "EN_DESCENSO",
          color: "#3B82F6",
          mensaje: `Consumo cayendo ↓${Math.abs(tendencia).toFixed(0)}%. Reducir pedidos`,
          stockActual: stock,
          consumoReciente: avgReciente,
          consumoAnterior: avgAnterior,
          tendenciaPct: tendencia,
        });
      }
    }

    // Ordenar por severidad
    const order: Record<string, number> = { RIESGO_DESABASTECIMIENTO: 0, DEMANDA_EN_AUMENTO: 1, SIN_ROTACION: 2, EN_DESCENSO: 3 };
    alerts.sort((a, b) => (order[a.tipo] ?? 99) - (order[b.tipo] ?? 99));

    return alerts;
  }),
});
