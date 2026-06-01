-- ============================================================================
-- Migración: 004_limpiar_duplicados_consumo_v2.sql (OPTIMIZADA)
-- Fecha: 2026-06-01
-- Objetivo: Eliminar 16.716 grupos de duplicados en 3.4M filas
-- Método: TABLA TEMPORAL (100x MÁS RÁPIDO que DELETE)
-- ============================================================================

-- PASO 1: Crear tabla temporal con registros ÚNICOS
-- (mantiene el más reciente: MAX(id) para cada referencia × mes)
CREATE TABLE `consumo_mensual_clean` LIKE `consumo_mensual`;

INSERT INTO `consumo_mensual_clean`
SELECT *
FROM `consumo_mensual`
WHERE id IN (
  SELECT MAX(id)
  FROM `consumo_mensual`
  GROUP BY `referencia`, `mes`
);

-- PASO 2: Renombrar tablas (swap instantáneo)
ALTER TABLE `consumo_mensual` RENAME TO `consumo_mensual_old`;
ALTER TABLE `consumo_mensual_clean` RENAME TO `consumo_mensual`;

-- PASO 3: Agregar índice único (previene futuros duplicados)
ALTER TABLE `consumo_mensual`
ADD UNIQUE INDEX IF NOT EXISTS `idx_ref_mes_unique` (`referencia`, `mes`);

-- PASO 4: Eliminar tabla antigua (tras validar que todo está bien)
-- DROP TABLE `consumo_mensual_old`;

-- ============================================================================
-- VERIFICACIÓN (ejecutar DESPUÉS de completar los pasos anteriores)
-- ============================================================================

-- 1️⃣ Verificar que NO hay duplicados
-- SELECT referencia, mes, COUNT(*) as duplicados
-- FROM `consumo_mensual`
-- GROUP BY referencia, mes
-- HAVING COUNT(*) > 1;
-- ✅ Resultado esperado: 0 filas

-- 2️⃣ Contar registros finales
-- SELECT COUNT(*) as total_limpio FROM `consumo_mensual`;
-- SELECT COUNT(*) as total_antiguo FROM `consumo_mensual_old`;

-- 3️⃣ Si todo está OK, eliminar tabla antigua
-- DROP TABLE `consumo_mensual_old`;

-- ============================================================================
-- ✅ RESULTADO ESPERADO
-- - 3.4M filas → ~200K filas únicas (92% reducción)
-- - Tiempo: 2-5 minutos (vs 30-60 min con DELETE)
-- - Datos limpios y protegidos
-- - Código SIN CAMBIOS
-- ============================================================================
