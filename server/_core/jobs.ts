/**
 * Background Jobs para Análisis de Inventario
 * Ejecuta automáticamente cada noche a las 2 AM (UTC)
 */

import {
  calculateABCClassification,
  calculateStockPredictions,
  calculateSupplierPerformance,
  detectAnomalies,
} from "../analytics/inventory-analysis";

let jobScheduled = false;

/**
 * Inicializar jobs automáticos
 * Se ejecuta cuando el servidor inicia
 */
export function initializeBackgroundJobs() {
  if (jobScheduled) return;

  console.log("[Jobs] Inicializando jobs automáticos...");

  // Ejecutar análisis cada noche a las 2 AM UTC
  scheduleNightlyAnalysis();

  jobScheduled = true;
}

/**
 * Programar análisis nocturno
 * Ejecuta a las 2 AM UTC (ajustable)
 */
function scheduleNightlyAnalysis() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(2, 0, 0, 0); // 2 AM UTC

  const timeUntilNextRun = tomorrow.getTime() - now.getTime();

  console.log(
    `[Jobs] Próximo análisis nocturno en ${Math.round(timeUntilNextRun / 1000 / 60)} minutos`
  );

  // Ejecutar por primera vez después del delay
  setTimeout(async () => {
    try {
      console.log("[Jobs] Iniciando análisis nocturno...");
      await runNightlyAnalysis();
    } catch (error) {
      console.error("[Jobs] Error en análisis nocturno:", error);
    }

    // Luego programar para cada 24 horas
    setInterval(async () => {
      try {
        console.log("[Jobs] Iniciando análisis nocturno (recurrente)...");
        await runNightlyAnalysis();
      } catch (error) {
        console.error("[Jobs] Error en análisis nocturno recurrente:", error);
      }
    }, 24 * 60 * 60 * 1000); // Cada 24 horas
  }, timeUntilNextRun);
}

/**
 * Ejecutar análisis completo
 */
async function runNightlyAnalysis() {
  const startTime = Date.now();

  try {
    console.log("[Jobs] [1/4] Calculando clasificación ABC...");
    await calculateABCClassification();

    console.log("[Jobs] [2/4] Calculando predicciones de stock...");
    await calculateStockPredictions();

    console.log("[Jobs] [3/4] Calculando desempeño de proveedores...");
    await calculateSupplierPerformance();

    console.log("[Jobs] [4/4] Detectando anomalías...");
    await detectAnomalies();

    const duration = Date.now() - startTime;
    console.log(`[Jobs] ✅ Análisis completo finalizado en ${duration}ms`);
  } catch (error) {
    console.error("[Jobs] ❌ Error durante análisis:", error);
    throw error;
  }
}

/**
 * Ejecutar análisis manualmente (para testing)
 */
export async function triggerAnalysisManually() {
  console.log("[Jobs] Análisis manual disparado...");
  await runNightlyAnalysis();
}
