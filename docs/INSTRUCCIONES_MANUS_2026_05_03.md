# 🚀 INSTRUCCIONES PARA MANUS — Actualización 3 Mayo 2026

## Contexto
El repositorio `https://github.com/Cristhiancol/somos-usme-assets` branch `main`
fue actualizado con las siguientes mejoras. Manus debe aplicarlas en producción.

---

## ✅ CAMBIOS QUE DEBE DESPLEGAR MANUS

### Commit actual: `c23c3cd` (main)

#### Cambios incluidos:
1. **Fix chatbot — consumo por referencia**: cuando el usuario pregunta por una referencia específica,
   el chatbot ahora consulta `getConsumoMensual(referencia)` y muestra el historial mensual completo
   con tendencia (↑ SUBIENDO / → ESTABLE / ↓ BAJANDO) calculada automáticamente.

2. **Fix valor inventario**: `getDashboardKPIs()` ahora usa `ROUND(SUM(...), 2)` en vez de `SUM(...)` puro,
   lo que elimina la diferencia de $1.36M vs el Excel original (mayor precisión decimal).

3. **Nuevos archivos (ya en GitHub)**:
   - `client/src/pages/Consumo.tsx` — página de análisis de consumo mensual
   - `client/src/pages/Analytics.tsx` — dashboard analítico avanzado
   - `client/src/pages/Admin.tsx` — panel de administración
   - `client/src/components/MarkdownRenderer.tsx` — renderer markdown para chatbot
   - `client/src/components/CommandPalette.tsx` — búsqueda global Ctrl+K
   - `client/src/components/NotificationCenter.tsx` — centro de notificaciones
   - `client/src/components/ExportButton.tsx` — botón de exportación Excel
   - `server/routers/consumo.ts` — endpoints de análisis de consumo
   - `server/routers/admin.ts` — endpoints de administración
   - `server/routers/exports.ts` — endpoints de exportación Excel

---

## 📋 PASOS A EJECUTAR (EN ORDEN)

### Paso 1: Actualizar código desde GitHub
```bash
cd /home/ubuntu/somos-usme-assets
git pull origin main
```
> Debe mostrar: `c23c3cd..HEAD` con los commits más recientes

### Paso 2: Instalar dependencias (si hay nuevas)
```bash
pnpm install
```

### Paso 3: Verificar tabla consumo_mensual (ya debería existir del paso anterior)
```sql
-- Ejecutar en MySQL:
SHOW TABLES LIKE 'consumo_mensual';
SELECT COUNT(*) FROM consumo_mensual;
```
> Si la tabla no existe, crearla:
```sql
CREATE TABLE IF NOT EXISTS `consumo_mensual` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `referencia` VARCHAR(64) NOT NULL,
  `fabricante` VARCHAR(128),
  `descripcion` TEXT,
  `mes` VARCHAR(7) NOT NULL,
  `cantidad` DOUBLE NOT NULL DEFAULT 0,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_consumo_ref` (`referencia`),
  INDEX `idx_consumo_mes` (`mes`),
  INDEX `idx_consumo_ref_mes` (`referencia`, `mes`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Paso 4: Ejecutar tests para validar
```bash
pnpm vitest run
```
> **DEBE PASAR: 246/246 tests** ✅

### Paso 5: Reiniciar el servidor de producción
```bash
pm2 restart somos-usme-assets
# O el nombre del proceso que use Manus
```

### Paso 6: Verificar que el dashboard responde
```bash
curl -s https://usme.blog/api/trpc/dashboard.kpis | head -c 200
```
> Debe devolver JSON con `totalRefs`, `totalValue`, `zeroStock`, etc.

### Paso 7: Verificar página de Consumo
```bash
curl -s https://usme.blog/api/trpc/consumo.summary | head -c 200
```
> Debe devolver JSON con `totalRegistros`, `totalRefs`, `totalConsumo`, `meses`

---

## 🧪 VALIDACIONES REQUERIDAS

| Validación | Esperado |
|-----------|---------|
| Tests | 246/246 ✅ |
| Dashboard KPIs | JSON válido con totalRefs ~1828 |
| Consumo summary | totalRegistros ~15,522 |
| Chatbot: preguntar por ref específica | Incluye historial de consumo mensual |
| Valor inventario en dashboard | ~$1.588B COP (más preciso) |

---

## 🔧 CONTEXTO TÉCNICO

### Cambio clave en `server/db.ts` (línea 67):
```typescript
// ANTES:
totalValue: sql<number>`COALESCE(SUM(${inventoryItems.totalStock}), 0)`,

// AHORA:
totalValue: sql<number>`COALESCE(ROUND(SUM(${inventoryItems.totalStock}), 2), 0)`,
```

### Cambio clave en `server/routers/chatbot.ts` (función fuzzySearch):
- Se agregó consulta a `getConsumoMensual(topRef)` después del fuzzy search
- Si la referencia tiene consumo, se añade sección `[CONSUMO_REFERENCIA]` al system prompt
- El chatbot ahora responde con: total consumido, promedio/mes, tendencia, desglose mensual

---

## 📊 ESTADO DEL SISTEMA (ESPERADO POST-DEPLOY)

- 1,828 referencias activas
- ~$1.588B COP valor inventario (más preciso con ROUND)
- 15,522 registros de consumo mensual
- 246/246 tests pasando
- Chatbot responde con datos de consumo histórico cuando preguntan por una referencia

---

**Generado:** 3 de mayo 2026 — commit `c23c3cd` en `main`
**Repositorio:** https://github.com/Cristhiancol/somos-usme-assets
