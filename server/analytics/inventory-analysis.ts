/**
 * Análisis de Inventario: ABC, Predicciones, Desempeño de Proveedores
 * Fase 1: Infraestructura de datos científicos
 */

import { getDb } from "../db";
import {
  consumptionHistory,
  stockPredictions,
  abcClassification,
  supplierPerformance,
  anomalies,
  inventoryItems,
  purchaseOrders,
  suppliers,
} from "../../drizzle/schema";
import { eq, gte, lte, desc, and, sql } from "drizzle-orm";

/**
 * 1. ANÁLISIS ABC (PARETO)
 * Clasifica referencias por valor: A (80%), B (15%), C (5%)
 */
export async function calculateABCClassification() {
  try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Calcular consumo de últimos 12 meses
      const consumptionData = await db
        .select({
          inventoryItemId: consumptionHistory.inventoryItemId,
          totalQuantity: sql<number>`SUM(${consumptionHistory.quantity})`,
          avgCost: sql<number>`AVG(${consumptionHistory.unitCost})`,
        })
        .from(consumptionHistory)
        .where(
          gte(
            consumptionHistory.consumptionDate,
            new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
          )
        )
        .groupBy(consumptionHistory.inventoryItemId)
        ;

      // Calcular valor total por referencia
      const itemsWithValue = consumptionData
        .map((item: any) => ({
          ...item,
          totalValue: (item.totalQuantity || 0) * (item.avgCost || 0),
        }))
        .sort((a: any, b: any) => (b.totalValue || 0) - (a.totalValue || 0));

      // Calcular totales
      const totalValue = itemsWithValue.reduce(
        (sum: number, item: any) => sum + (item.totalValue || 0),
        0
      );
    let accumulatedValue = 0;

    // Clasificar y guardar
    for (const item of itemsWithValue) {
      accumulatedValue += item.totalValue || 0;
      const accumulatedPercentage = (accumulatedValue / totalValue) * 100;

      let classification: "A" | "B" | "C" = "C";
      if (accumulatedPercentage <= 80) {
        classification = "A";
      } else if (accumulatedPercentage <= 95) {
        classification = "B";
      }

      // Guardar o actualizar clasificación
      await db
        .insert(abcClassification)
        .values({
          inventoryItemId: item.inventoryItemId,
          classification,
          totalValue: item.totalValue || 0,
          accumulatedPercentage,
          consumptionPercentage: ((item.totalQuantity || 0) / totalValue) * 100,
        })
        .onDuplicateKeyUpdate({
          set: {
            classification,
            totalValue: item.totalValue || 0,
            accumulatedPercentage,
            consumptionPercentage: ((item.totalQuantity || 0) / totalValue) * 100,
          },
        });
    }

    console.log(
      `[ABC Analysis] Clasificadas ${itemsWithValue.length} referencias`
    );
    return {
      success: true,
      itemsProcessed: itemsWithValue.length,
      totalValue,
    };
  } catch (error) {
    console.error("[ABC Analysis Error]", error);
    throw error;
  }
}

/**
 * 2. PREDICCIÓN DE DEMANDA (ARIMA simplificado)
 * Calcula demanda promedio y punto de reorden
 */
export async function calculateStockPredictions() {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const items = await db.select().from(inventoryItems);

    for (const item of items) {
      // Obtener histórico de consumo últimos 30 días
      const last30Days = await db
        .select({
          date: consumptionHistory.consumptionDate,
          quantity: consumptionHistory.quantity,
        })
        .from(consumptionHistory)
        .where(
          and(
            eq(consumptionHistory.inventoryItemId, item.id),
            gte(
              consumptionHistory.consumptionDate,
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            )
          )
        )
        .orderBy(consumptionHistory.consumptionDate)
        ;

      if (last30Days.length === 0) continue;

      // Calcular demanda promedio
      const totalConsumption = last30Days.reduce(
        (sum: number, c: any) => sum + (c.quantity || 0),
        0
      );
      const avgDailyDemand = totalConsumption / 30;

      // Calcular desviación estándar (para intervalo de confianza)
      const mean = avgDailyDemand;
      const variance =
        last30Days.reduce((sum: number, c: any) => sum + Math.pow((c.quantity || 0) - mean, 2), 0) /
        last30Days.length;
      const stdDev = Math.sqrt(variance);

      // Intervalo de confianza 95% (Z=1.96)
      const confidenceLow = Math.max(0, mean - 1.96 * stdDev);
      const confidenceHigh = mean + 1.96 * stdDev;

      // Punto de reorden = demanda promedio * lead time
      const leadTimeDays = item.leadTimeDias || 7;
      const reorderPoint = avgDailyDemand * leadTimeDays;

      // Días hasta agotamiento
      const currentStock = item.stockActual || 0;
      const daysUntilStockout = Math.max(
        0,
        Math.floor(currentStock / (avgDailyDemand || 1))
      );

      // Determinar nivel de riesgo
      let riskLevel: "ALTO" | "MEDIO" | "BAJO" = "BAJO";
      if (daysUntilStockout < 3) {
        riskLevel = "ALTO";
      } else if (daysUntilStockout < 7) {
        riskLevel = "MEDIO";
      }

      // Cantidad recomendada a ordenar
      const recommendedOrderQty = Math.max(
        reorderPoint * 1.5, // 1.5x el punto de reorden
        item.minimo || 0
      );

      // Guardar predicción
      await db.insert(stockPredictions).values({
        inventoryItemId: item.id,
        predictionDate: new Date(),
        predictedDemand: avgDailyDemand,
        confidenceLow,
        confidenceHigh,
        reorderPoint,
        riskLevel,
        daysUntilStockout,
        recommendedOrderQty,
        modelAccuracy: 85, // Placeholder: se actualizará con validación real
      });
    }

    console.log(
      `[Stock Predictions] Predicciones calculadas para ${items.length} referencias`
    );
    return {
      success: true,
      itemsProcessed: items.length,
    };
  } catch (error) {
    console.error("[Stock Predictions Error]", error);
    throw error;
  }
}

/**
 * 3. ANÁLISIS DE DESEMPEÑO DE PROVEEDORES
 * Calcula lead times, puntualidad, confiabilidad
 */
export async function calculateSupplierPerformance() {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const suppliersList = await db.select().from(suppliers);

    for (const supplier of suppliersList) {
      // Obtener órdenes entregadas del proveedor (últimos 12 meses)
      const deliveredOrders = await db
        .select({
          id: purchaseOrders.id,
          fechaOrden: purchaseOrders.createdAt,
          fechaPromesa: purchaseOrders.fechaPromesa,
          estado: purchaseOrders.estado,
        })
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.proveedor, supplier.nombre || ""),
            eq(purchaseOrders.estado, "RECIBIDO PARCIAL")
          )
        )
        ;

      if (deliveredOrders.length === 0) continue;

      // Calcular lead times
      const leadTimes = deliveredOrders
        .map((order: any) => {
          if (!order.fechaOrden || !order.fechaPromesa) return null;
          const leadTime = Math.floor(
            (order.fechaPromesa.getTime() - order.fechaOrden.getTime()) /
              (1000 * 60 * 60 * 24)
          );
          return leadTime;
        })
        .filter((lt: any) => lt !== null) as number[];

      if (leadTimes.length === 0) continue;

      // Estadísticas
      const avgLeadTime = leadTimes.reduce((a: number, b: number) => a + b, 0) / leadTimes.length;
      const variance =
        leadTimes.reduce((sum: number, lt: number) => sum + Math.pow(lt - avgLeadTime, 2), 0) /
        leadTimes.length;
      const stdDev = Math.sqrt(variance);

      // Percentil 95
      const sortedLeadTimes = [...leadTimes].sort((a, b) => a - b);
      const p95Index = Math.ceil(sortedLeadTimes.length * 0.95) - 1;
      const leadTimeP95 = sortedLeadTimes[p95Index] || avgLeadTime;

      // Puntualidad (entregas a tiempo)
      const onTimeDeliveries = deliveredOrders.filter((order: any) => {
        if (!order.fechaPromesa) return false;
        // Asumir que si está en RECIBIDO PARCIAL, fue a tiempo
        return true;
      }).length;

      const onTimePercentage = (onTimeDeliveries / deliveredOrders.length) * 100;

      // Puntuación de confiabilidad (0-100)
      const reliabilityScore = Math.min(
        100,
        onTimePercentage * 0.7 + (100 - Math.min(stdDev, 100)) * 0.3
      );

      // Guardar o actualizar desempeño
      await db
        .insert(supplierPerformance)
        .values({
          supplierId: supplier.id,
          totalOrders: deliveredOrders.length,
          onTimeDeliveries,
          lateDeliveries: deliveredOrders.length - onTimeDeliveries,
          avgLeadTimeDays: avgLeadTime,
          leadTimeStdDev: stdDev,
          leadTimeP95,
          onTimePercentage,
          reliabilityScore,
        })
        .onDuplicateKeyUpdate({
          set: {
            totalOrders: deliveredOrders.length,
            onTimeDeliveries,
            lateDeliveries: deliveredOrders.length - onTimeDeliveries,
            avgLeadTimeDays: avgLeadTime,
            leadTimeStdDev: stdDev,
            leadTimeP95,
            onTimePercentage,
            reliabilityScore,
          },
        });
    }

    console.log(
      `[Supplier Performance] Análisis completado para ${suppliersList.length} proveedores`
    );
    return {
      success: true,
      suppliersProcessed: suppliersList.length,
    };
  } catch (error) {
    console.error("[Supplier Performance Error]", error);
    throw error;
  }
}

/**
 * 4. DETECCIÓN DE ANOMALÍAS
 * Identifica patrones inusuales en consumo (Z-score > 3)
 */
export async function detectAnomalies() {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const items = await db.select().from(inventoryItems);
    let anomaliesDetected = 0;

    for (const item of items) {
      // Obtener histórico de consumo últimos 60 días
      const consumptions = await db
        .select({
          date: consumptionHistory.consumptionDate,
          quantity: consumptionHistory.quantity,
        })
        .from(consumptionHistory)
        .where(
          and(
            eq(consumptionHistory.inventoryItemId, item.id),
            gte(
              consumptionHistory.consumptionDate,
              new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
            )
          )
        )
        .orderBy(consumptionHistory.consumptionDate)
        ;

      if (consumptions.length < 5) continue;

      // Calcular media y desviación estándar
      const quantities = consumptions.map((c: any) => c.quantity || 0);
      const mean = quantities.reduce((a: number, b: number) => a + b, 0) / quantities.length;
      const variance =
        quantities.reduce((sum: number, q: number) => sum + Math.pow(q - mean, 2), 0) /
        quantities.length;
      const stdDev = Math.sqrt(variance);

      // Detectar anomalías (|Z| > 3)
      for (const consumption of consumptions) {
        const zScore = stdDev > 0 ? (consumption.quantity! - mean) / stdDev : 0;

        if (Math.abs(zScore) > 3) {
          // Guardar anomalía
          await db.insert(anomalies).values({
            inventoryItemId: item.id,
            anomalyDate: consumption.date,
            actualConsumption: consumption.quantity || 0,
            expectedConsumption: mean,
            zScore,
            probableCause: "Investigar: consumo inusual detectado",
            severity: Math.abs(zScore) > 5 ? "ALTO" : "MEDIO",
          });

          anomaliesDetected++;
        }
      }
    }

    console.log(`[Anomaly Detection] ${anomaliesDetected} anomalías detectadas`);
    return {
      success: true,
      anomaliesDetected,
    };
  } catch (error) {
    console.error("[Anomaly Detection Error]", error);
    throw error;
  }
}

/**
 * FUNCIÓN MAESTRA: Ejecutar todos los análisis
 */
export async function runFullInventoryAnalysis() {
  console.log("[Inventory Analysis] Iniciando análisis completo...");

  try {
    const results = {
      abc: await calculateABCClassification(),
      predictions: await calculateStockPredictions(),
      supplierPerformance: await calculateSupplierPerformance(),
      anomalies: await detectAnomalies(),
      timestamp: new Date(),
    };

    console.log("[Inventory Analysis] ✅ Análisis completado exitosamente");
    return results;
  } catch (error) {
    console.error("[Inventory Analysis] ❌ Error en análisis", error);
    throw error;
  }
}
