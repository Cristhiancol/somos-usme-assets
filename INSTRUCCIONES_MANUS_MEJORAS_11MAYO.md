# 🚀 INSTRUCCIONES PARA MANUS — Mejoras Sistema JIT (11 Mayo 2026)

## RESUMEN
Se implementaron 7 mejoras al sistema JIT de Somos Usme. Los cambios ya están en el código local y necesitan ser desplegados.

---

## 📦 PASO 1: INSTALAR NUEVAS DEPENDENCIAS

Se agregaron 3 nuevas librerías al proyecto. Ejecutar:

```bash
pnpm install
```

Las dependencias nuevas son:
- `qrcode` — Generación de códigos QR en el frontend
- `html5-qrcode` — Scanner QR con cámara del dispositivo
- `@types/qrcode` — Tipos TypeScript para qrcode

---

## 📁 PASO 2: ARCHIVOS NUEVOS CREADOS

Verificar que estos archivos existen:

### Archivos nuevos:
1. `client/src/pages/QRAccess.tsx` — Página de generación y escaneo de QR
2. `shared/schemas.ts` — Schemas de validación Zod compartidos

### Archivos modificados:
3. `client/src/App.tsx` — Agregada ruta `/qr-acceso` y nav item QR
4. `client/src/components/CommandPalette.tsx` — Búsqueda inteligente con datos reales (inventario, OC, proveedores)
5. `client/src/components/StockChatbot.tsx` — Chat v3.0 con localStorage y mejoras UI
6. `client/src/components/DashboardLayout.tsx` — Removido import unused de Zap
7. `client/src/pages/Home.tsx` — Icono ⚡ reemplazado por SVG profesional de cadena de suministro
8. `client/src/pages/Orders.tsx` — KPIs resumen + columna Fecha Promesa

---

## 🔧 PASO 3: BUILD Y DEPLOY

```bash
# Verificar que TypeScript compila sin errores
pnpm run check

# Build para producción
pnpm build

# Iniciar servidor
pnpm start
```

---

## ✅ PASO 4: VERIFICACIÓN POST-DEPLOY

Verificar en https://www.usme.blog que:

1. **Búsqueda (Ctrl+K)**: Al presionar Ctrl+K, la búsqueda ahora muestra resultados reales de inventario, órdenes y proveedores (no solo páginas)
2. **QR Acceso**: En el sidebar aparece "QR Acceso" — al hacer clic muestra generador de QR que apunta a https://www.usme.blog y un scanner con cámara
3. **Icono corregido**: El icono junto a "SISTEMA JIT" en el Dashboard ya NO es un rayo (⚡) distorsionado, ahora es un icono de cadena de suministro profesional
4. **Chat Stock**: El chatbot mantiene el historial de conversación al cerrar y reabrir el navegador (ya no se pierde)
5. **Órdenes**: La página de Órdenes Pendientes muestra 4 tarjetas KPI arriba (total, valor, retraso, vencidas) y una columna "F. PROMESA" en la tabla

---

## ⚠️ NOTAS IMPORTANTES

- **NO se requieren cambios en la base de datos** — No hay migraciones
- **NO se requieren nuevas variables de entorno** — Todo funciona con la config existente
- **NO se agregó Python, Flask ni Cerberus** — El proyecto es 100% TypeScript
- Las validaciones se implementaron con **Zod** (equivalente TypeScript de Cerberus)
- La búsqueda inteligente usa **Fuse.js** (ya estaba instalado) + queries tRPC en tiempo real
- El QR se genera 100% en el frontend (no requiere endpoint backend)

---

## 📋 LISTADO COMPLETO DE CAMBIOS

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `package.json` | MODIFICADO | 3 nuevas dependencias (qrcode, html5-qrcode, @types/qrcode) |
| `client/src/pages/QRAccess.tsx` | **NUEVO** | Página completa de generación y escaneo de QR |
| `shared/schemas.ts` | **NUEVO** | Schemas Zod para validación de OC, refs, búsquedas |
| `client/src/App.tsx` | MODIFICADO | Ruta `/qr-acceso`, import QrCode, nav item |
| `client/src/components/CommandPalette.tsx` | MODIFICADO | Búsqueda inteligente con inventario, OC y proveedores reales |
| `client/src/components/StockChatbot.tsx` | MODIFICADO | localStorage, header gradiente, más sugerencias |
| `client/src/components/DashboardLayout.tsx` | MODIFICADO | Removido import unused Zap |
| `client/src/pages/Home.tsx` | MODIFICADO | Icono SVG cadena de suministro (reemplaza Zap) |
| `client/src/pages/Orders.tsx` | MODIFICADO | 4 KPIs resumen + columna Fecha Promesa |

---

## 🔄 COMANDOS GIT SUGERIDOS

```bash
git add .
git commit -m "feat: Mejoras JIT v2.0 — Búsqueda inteligente, QR, chat, validaciones, iconografía

- 🔍 CommandPalette busca refs, OC y proveedores reales (Ctrl+K)
- 📱 Nueva página QR (/qr-acceso) con generador + scanner
- 🎨 Icono ⚡ reemplazado por SVG profesional
- 💬 Chat v3.0 con localStorage (persiste entre sesiones)
- ✅ Schemas Zod compartidos (validación frontend+backend)
- 📦 Órdenes: KPIs resumen + columna Fecha Promesa
- 🧹 Removidos imports unused"

git push origin main
```
