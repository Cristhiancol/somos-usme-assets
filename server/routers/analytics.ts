/**
 * tRPC Router para Análisis de Inventario
 * Fase 1: Predicciones y ABC
 */

import { router, protectedProcedure } from "../_core/trpc";
import {
  runFullInventoryAnalysis,
  calculateABCClassification,
  calculateStockPredictions,
  calculateSupplierPerformance,
  detectAnomalies,
} from "../analytics/inventory-analysis";
import { getDb } from "../db";
import { stockPredictions, abcClassification, supplierPerformance, anomalies } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const analyticsRouter = router({
  /**
   * Ejecutar análisis completo (ABC + Predicciones + Desempeño + Anomalías)
   * Solo admin puede ejecutar
   */
  runFullAnalysis: protectedProcedure
    .use(async ({ ctx, next }: any) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Only admins can run full analysis");
      }
      return next({ ctx });
    })
    .mutation(async () => {
      try {
        const results = await runFullInventoryAnalysis();
        return {
          success: true,
          results,
          message: "Análisis completo ejecutado exitosamente",
        };
      } catch (error) {
        console.error("[Analytics Router] Error en análisis completo:", error);
        throw error;
      }
    }),

  /**
   * Obtener predicciones de stock para referencias en riesgo
   */
  getStockPredictions: protectedProcedure
    .input(
      z.object({
        riskLevel: z.enum(["ALTO", "MEDIO", "BAJO"]).optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }: any) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        let query: any = db.select().from(stockPredictions);

        if (input.riskLevel) {
          query = query.where(eq(stockPredictions.riskLevel, input.riskLevel));
        }

        const predictions = await query;
        return {
          success: true,
          count: predictions.length,
          predictions: predictions.slice(0, input.limit),
        };
      } catch (error) {
        console.error("[Analytics] Error obteniendo predicciones:", error);
        throw error;
      }
    }),

  /**
   * Obtener clasificación ABC
   */
  getABCClassification: protectedProcedure
    .input(
      z.object({
        classification: z.enum(["A", "B", "C"]).optional(),
      })
    )
    .query(async ({ input }: any) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        let query: any = db.select().from(abcClassification);

        if (input.classification) {
          query = query.where(eq(abcClassification.classification, input.classification));
        }

        const classifications = await query;

        // Calcular estadísticas
        const totalValue = classifications.reduce((sum: number, item: any) => sum + (item.totalValue || 0), 0);
        const countByClass = {
          A: classifications.filter((c: any) => c.classification === "A").length,
          B: classifications.filter((c: any) => c.classification === "B").length,
          C: classifications.filter((c: any) => c.classification === "C").length,
        };

        return {
          success: true,
          totalValue,
          countByClass,
          classifications,
        };
      } catch (error) {
        console.error("[Analytics] Error obteniendo ABC:", error);
        throw error;
      }
    }),

  /**
   * Obtener desempeño de proveedores
   */
  getSupplierPerformance: protectedProcedure
    .input(
      z.object({
        minReliabilityScore: z.number().default(0),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }: any) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const performance = await db.select().from(supplierPerformance);

        const filtered = performance
          .filter((p) => (p.reliabilityScore || 0) >= input.minReliabilityScore)
          .sort((a, b) => (b.reliabilityScore || 0) - (a.reliabilityScore || 0))
          .slice(0, input.limit);

        return {
          success: true,
          count: filtered.length,
          performance: filtered,
        };
      } catch (error) {
        console.error("[Analytics] Error obteniendo desempeño:", error);
        throw error;
      }
    }),

  /**
   * Obtener anomalías detectadas
   */
  getAnomalies: protectedProcedure
    .input(
      z.object({
        severity: z.enum(["BAJO", "MEDIO", "ALTO"]).optional(),
        resolved: z.boolean().optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }: any) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const allAnomalies = await db.select().from(anomalies);

        let filtered = allAnomalies;

        if (input.severity) {
          filtered = filtered.filter((a) => a.severity === input.severity);
        }

        if (input.resolved !== undefined) {
          filtered = filtered.filter((a) => (a.resolved ? true : false) === input.resolved);
        }

        return {
          success: true,
          count: filtered.length,
          anomalies: filtered.slice(0, input.limit),
        };
      } catch (error) {
        console.error("[Analytics] Error obteniendo anomalías:", error);
        throw error;
      }
    }),

  /**
   * Obtener dashboard resumen
   */
  getDashboardSummary: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Predicciones de alto riesgo
      const highRiskPredictions = await db.select().from(stockPredictions);
      const highRisk = highRiskPredictions.filter((p) => p.riskLevel === "ALTO");

      // ABC
      const abcData = await db.select().from(abcClassification);
      const classA = abcData.filter((c) => c.classification === "A");

      // Anomalías sin resolver
      const allAnomalies = await db.select().from(anomalies);
      const unresolved = allAnomalies.filter((a) => !a.resolved);

      // Desempeño de proveedores
      const perfData = await db.select().from(supplierPerformance);
      const avgReliability = perfData.length > 0
        ? perfData.reduce((sum, p) => sum + (p.reliabilityScore || 0), 0) / perfData.length
        : 0;

      return {
        success: true,
        summary: {
          highRiskReferences: highRisk.length,
          classAReferences: classA.length,
          unresolvedAnomalies: unresolved.length,
          avgSupplierReliability: Math.round(avgReliability * 100) / 100,
          totalSuppliers: perfData.length,
        },
      };
    } catch (error) {
      console.error("[Analytics] Error obteniendo resumen:", error);
      throw error;
    }
  }),
});
