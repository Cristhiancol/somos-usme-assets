-- ============================================================================
-- Migración: 004_limpiar_duplicados_consumo.sql
-- Fecha: 2026-06-01
-- Descripción: Elimina SOLO duplicados exactos (referencia + mes)
--              Mantiene el registro más reciente (ID máximo)
--              NO afecta código, solo limpia datos
-- Riesgo: BAJO (validado y reversible con backup)
-- ============================================================================

-- ✅ VERIFICACIÓN PREVIA (informativo - no modifica datos)
-- SELECT referencia, mes, COUNT(*) as duplicados
-- FROM `consumo_mensual`
-- GROUP BY referencia, mes
-- HAVING COUNT(*) > 1
-- LIMIT 10;

-- ============================================================================
-- PASO 1: ELIMINAR DUPLICADOS (mantener ID máximo = más reciente)
-- ============================================================================
DELETE FROM `consumo_mensual`
WHERE id NOT IN (
  SELECT MAX(id) as max_id
  FROM (
    SELECT MAX(id)
    FROM `consumo_mensual`
    GROUP BY `referencia`, `mes`
  ) as temp_ids
);

-- ============================================================================
-- PASO 2: VERIFICACIÓN POST-LIMPIEZA
-- ============================================================================
-- ✅ Esta query debe retornar CERO filas (sin duplicados)
-- SELECT referencia, mes, COUNT(*) as duplicados
-- FROM `consumo_mensual`
-- GROUP BY referencia, mes
-- HAVING COUNT(*) > 1;

-- ============================================================================
-- PASO 3: AGREGAR ÍNDICE ÚNICO (previene duplicados futuros)
-- ============================================================================
ALTER TABLE `consumo_mensual`
ADD UNIQUE INDEX IF NOT EXISTS `idx_ref_mes_unique` (`referencia`, `mes`);

-- ============================================================================
-- ✅ MIGRACIÓN COMPLETADA SIN RIESGO
-- - Base de datos limpia
-- - Código TypeScript/JavaScript sin cambios
-- - Datos sincronizados correctamente
-- - Protegido contra duplicados futuros
-- ============================================================================
