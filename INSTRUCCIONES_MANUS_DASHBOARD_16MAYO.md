# 🚀 INSTRUCCIONES PARA MANUS — Rediseño Dashboard Asset Tracker (16 Mayo 2026)

## RESUMEN
Se rediseñó completamente el dashboard principal (Home) del sistema JIT con un estilo premium "Asset Tracker" inspirado en dashboards modernos de inventario. Los colores corporativos de Somos Bogotá se mantienen.

---

## 📦 PASO 1: ACTUALIZAR CÓDIGO

```bash
cd /home/ubuntu/somos-usme-assets
git pull origin main
```

---

## 🔧 PASO 2: BUILD Y DEPLOY

```bash
# NO se requieren nuevas dependencias — solo pull + build
pnpm install
pnpm run check
pnpm build
pnpm start
```

---

## ✅ PASO 3: VERIFICACIÓN POST-DEPLOY

Verificar en https://www.usme.blog que:

1. **Dashboard rediseñado**: Al entrar al dashboard principal, se ve el nuevo diseño "Asset Tracker" con:
   - 8 KPI cards en 2 filas (4+4) con bordes de color superior
   - Barras de valor por categoría con progreso animado
   - Tabla de categorías con mayor riesgo de stock cero
   - 2 gráficos de dona (distribución por categoría + estado del inventario)
   - Panel de alertas de stock (CRÍTICO, REORDEN, PRECAUCIÓN, SEGURO)
   - Tabla de distribución por cuenta

2. **Sidebar sin cambios**: La barra lateral izquierda funciona igual
3. **Otras páginas sin cambios**: Analytics, Inventario, Órdenes, etc. funcionan igual

---

## 📁 ARCHIVOS MODIFICADOS

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `client/src/pages/Home.tsx` | MODIFICADO | Dashboard rediseñado completamente con estilo Asset Tracker |
| `client/src/index.css` | MODIFICADO | Nuevas clases CSS `.at-card`, `.at-kpi`, `.at-badge`, etc. |

---

## ⚠️ NOTAS IMPORTANTES

- **NO se requieren cambios en la base de datos** — No hay migraciones
- **NO se requieren nuevas variables de entorno**
- **NO se agregaron nuevas dependencias**
- Solo son cambios de frontend (HTML/CSS/TSX)

---

## 🔄 SI NECESITAS HACER COMMIT + PUSH

```bash
git add .
git commit -m "feat: Rediseño dashboard Asset Tracker v2.0

- 🎨 Dashboard Home rediseñado con estilo premium Asset Tracker
- 📊 8 KPI cards con bordes de color y animaciones
- 📈 Barras de valor por categoría con progreso animado
- 🍩 2 gráficos de dona (categorías + estado inventario)
- 🚨 Panel de alertas de stock con semáforo JIT
- 🎯 Tabla de riesgo stock cero por categoría
- ✨ Nuevas clases CSS .at-card, .at-kpi, .at-badge"

git push origin main
```
