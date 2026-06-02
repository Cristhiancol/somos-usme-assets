
# 📋 INSTRUCCIÓN PARA MANUS - DEPLOY LIMPIEZA DE DUPLICADOS
## Fecha: 2026-06-01 | Estado: LISTO PARA PRODUCCIÓN

---

## 🎯 OBJETIVO
Ejecutar migración de limpieza de duplicados en `consumo_mensual` y sincronizar todo sin afectar Drive.

---

## ⚠️ PRE-REQUISITOS VALIDADOS
- ✅ Backup de DB realizado: `consumo_mensual_backup.sql`
- ✅ Migración SQL verificada: `drizzle/migrations/004_limpiar_duplicados_consumo.sql`
- ✅ Código TypeScript sin cambios
- ✅ Índices protegidos contra futuros duplicados
- ✅ Sincronización de Drive NO se verá afectada

---

## 🔧 INSTRUCCIONES PASO A PASO PARA MANUS

### **PASO 1: CARGA Y VALIDACIÓN** ⚡
```bash
# 1️⃣ Descargar últimos cambios
git pull origin main

# 2️⃣ Instalar dependencias (si hay cambios)
npm install
# o
pnpm install

# 3️⃣ Validar que TypeScript compile sin errores
npm run check
# Resultado esperado: ✅ SIN ERRORES
```

---

### **PASO 2: EJECUTAR MIGRACIÓN** 🗄️
```bash
# 4️⃣ Generar y ejecutar migraciones Drizzle
npm run db:push
# Esto ejecutará automáticamente:
#   - drizzle/migrations/004_limpiar_duplicados_consumo.sql
#   - Limpiará duplicados
#   - Agregará índice único

# ✅ Resultado esperado:
# "Migration successful: 004_limpiar_duplicados_consumo.sql"
```

---

### **PASO 3: COMPILAR APLICACIÓN** 🏗️
```bash
# 5️⃣ Build sin cambios (código intacto)
npm run build
# Resultado esperado: ✅ BUILD EXITOSO (sin warnings TypeScript)
```

---

### **PASO 4: REINICIAR SERVIDOR** 🔄
```bash
# 6️⃣ Reiniciar con PM2 (o tu plataforma de deploy)
pm2 restart somos-usme

# 7️⃣ Verificar logs
pm2 logs somos-usme

# Resultado esperado: ✅ APP CORRIENDO SIN ERRORES
```

---

### **PASO 5: PUBLICAR CAMBIOS** 📤
```bash
# 8️⃣ Hacer commit de la migración
git add drizzle/migrations/004_limpiar_duplicados_consumo.sql
git commit -m "🗄️ Migración: Limpiar duplicados en consumo_mensual (SEGURO)"

# 9️⃣ Hacer commit de instrucción
git add INSTRUCCION_MANUS_DEPLOY.md
git commit -m "📋 Instrucción MANUS: Deploy de limpieza de duplicados"

# 🔟 Publicar a GitHub
git push origin main
```

---

## 🔍 VALIDACIÓN POST-DEPLOY

### **Ejecutar en MySQL para confirmar éxito:**
```sql
-- 1️⃣ Verificar que NO hay duplicados
SELECT referencia, mes, COUNT(*) as duplicados
FROM `consumo_mensual`
GROUP BY referencia, mes
HAVING COUNT(*) > 1;
-- ✅ Resultado esperado: CERO FILAS (sin duplicados)

-- 2️⃣ Verificar integridad de datos
SELECT COUNT(*) as total_registros
FROM `consumo_mensual`;
-- ✅ Resultado esperado: Número menor o igual al anterior

-- 3️⃣ Verificar índice único
SHOW INDEX FROM `consumo_mensual` WHERE Column_name = 'referencia';
-- ✅ Resultado esperado: idx_ref_mes_unique visible
```

---

## 📊 SINCRONIZACIÓN CON DRIVE (SIN CAMBIOS)

```bash
# 1️⃣ La sincronización de Drive NO se verá afectada
# Los endpoints /api/sync-drive funcionarán normalmente:
#   - Google Sheets → Database ✅
#   - Database → Reports ✅
#   - Sin modificaciones a índices o lógica de sync

# 2️⃣ Si necesitas forzar resync de consumo:
curl -X POST http://localhost:3000/api/sync-drive \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "consumo_mensual"}'
# ✅ Resultado: Datos sincronizados correctamente
```

---

## ✅ CHECKLIST FINAL (para MANUS)

- [ ] `git pull origin main` ejecutado sin conflictos
- [ ] `npm install` completado
- [ ] `npm run check` sin errores TypeScript
- [ ] `npm run db:push` ejecutado exitosamente
- [ ] `npm run build` compiló sin warnings
- [ ] `pm2 restart somos-usme` servidor corriendo
- [ ] Migración SQL ejecutada (verificar DB)
- [ ] `git push origin main` publicado
- [ ] Logs del servidor limpios (sin errores)
- [ ] Drive sincronizado correctamente (verificar últimos datos)

---

## 🚨 SI ALGO SALE MAL (ROLLBACK)

```bash
# 1️⃣ Revertir último commit
git revert HEAD --no-edit

# 2️⃣ Restaurar DB desde backup
mysql -u [usuario] -p [base] < consumo_mensual_backup.sql

# 3️⃣ Reiniciar servidor
pm2 restart somos-usme

# 4️⃣ Publicar rollback
git push origin main
```

---

## 📌 RESUMEN DE CAMBIOS
| Componente | Estado | Riesgo |
|-----------|--------|--------|
| **Migración SQL** | ✅ Nuevo | 🟢 Bajo (con backup) |
| **Código TypeScript** | ➖ Sin cambios | 🟢 Sin riesgo |
| **Código JavaScript** | ➖ Sin cambios | 🟢 Sin riesgo |
| **Sincronización Drive** | ✅ Funcionando | 🟢 Sin cambios |
| **Índices de BD** | ✅ Mejorados | 🟢 Preventivo |

---

## 📞 CONTACTO
Si hay problemas:
1. Revisar `pm2 logs somos-usme`
2. Ejecutar validación SQL post-deploy
3. Usar ROLLBACK si es necesario
4. Contactar equipo técnico

**Generado: 2026-06-01 | Versión: 1.0 | Estado: PRODUCCIÓN LISTA**
