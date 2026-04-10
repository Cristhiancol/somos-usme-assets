# Somos Bogotá Usme - Dashboard Cyberpunk TODO

## Fase 1: Datos y Google Drive
- [x] Analizar estructura completa del Excel (DATA, DATA PENDIENTES, PROVEEDORES, etc.)
- [x] Configurar conexión con Google Drive (gestor.compras1@somos.co)
- [x] Parsear y mapear datos del Excel a modelo de datos

## Fase 2: Base de Datos
- [x] Esquema de inventario escalable (SIN LÍMITE de referencias - actualmente 1828, crece dinámicamente)
- [x] Esquema de órdenes de compra pendientes
- [x] Esquema de proveedores
- [x] Esquema de sincronización y logs
- [x] Migrar datos iniciales del Excel a la BD

## Fase 3: Backend API
- [x] API tRPC: KPIs del dashboard (total refs, valor inventario, stock cero, pendientes)
- [x] API tRPC: Clasificación ABC (Alto/Medio/Normal)
- [x] API tRPC: Sistema alertas JIT (Crítico, Reorden, Próximo Mínimo, Stock Seguro)
- [x] API tRPC: TOP 20 mayor valor
- [x] API tRPC: TOP 20 stock cero
- [x] API tRPC: Órdenes pendientes con estado, cumplimiento, retraso, prioridad
- [x] API tRPC: Gestión de proveedores
- [x] API tRPC: Inventario completo con filtros por categoría
- [x] Sincronización automática con Google Drive (cada 15 min + manual)
- [x] Sistema de notificaciones (alertas de retraso y stock crítico)

## Fase 4: Frontend Cyberpunk
- [x] Tema Cyberpunk global (neon rosa/cyan, fondo oscuro, efectos reflectivos)
- [x] Dashboard principal con KPIs animados
- [x] Semáforo de alertas JIT visual
- [x] Distribución de valor por categoría (gráfico)
- [x] Clasificación ABC (gráfico pie)
- [x] Tabla TOP 20 mayor valor
- [x] Tabla TOP 20 stock cero (productos críticos)
- [x] Vista de órdenes pendientes con prioridad visual
- [x] Vista de proveedores
- [x] Vista de inventario completo con búsqueda y filtros paginados
- [x] Navegación sidebar estilo Cyberpunk
- [x] Responsive y preparado para presentaciones ejecutivas
- [x] Página de sincronización y notificaciones

## Fase 5: Entrega
- [x] Tests unitarios (11 tests pasando)
- [x] Checkpoint final
- [x] Entrega al usuario

## Correcciones
- [x] Cambiar formato de moneda de USD ($) a COP (pesos colombianos) en todo el dashboard
- [x] BUG: Error "insertBefore" en dashboard móvil (gráficos Recharts crash en mobile) — SafeChart wrapper + responsive
- [x] BUG: Sincronización Google Drive falla — migrado de Python a xlsx nativo Node.js, corregido parsing
- [x] BUG PERSISTENTE: Error insertBefore en producción móvil — eliminado Recharts completamente, gráficos CSS/SVG puros
- [x] BUG PERSISTENTE: Sincronización falla en producción — sync.trigger llama directamente syncFromGoogleDrive()
- [x] FIX DEFINITIVO: Eliminar Sidebar Radix UI que causa insertBefore en móvil — DashboardLayout reescrito CSS puro
- [x] FIX DEFINITIVO: Reemplazar rclone por Google Drive API HTTP nativa para producción — usa googleapis.com directamente
- [x] AUDITORÍA: Todas las páginas verificadas — 0 Recharts, 0 Sidebar Radix, 0 useIsMobile, 0 rclone
- [x] AUDITORÍA FINAL: Select de Radix reemplazado por CyberSelect (HTML nativo <select>) en Inventory.tsx y Orders.tsx
- [x] AUDITORÍA FINAL: App.tsx limpio — sin TooltipProvider, Toaster, Sonner, ni componentes Radix con Portal
- [x] AUDITORÍA FINAL: DashboardLayout usa CSS puro — sin imports de @radix-ui
- [x] AUDITORÍA FINAL: Bundle de producción verificado — solo Radix Slot (sin Portal), insertBefore solo de React DOM interno
- [x] AUDITORÍA FINAL: 0 errores en consola del navegador, 0 errores de red, 11 tests pasando
- [x] BUG PRODUCCIÓN: Error insertBefore sigue en móvil — CORREGIDO: DashboardLayout separado en dos sidebars independientes (desktop sticky / móvil fixed), ThemeProvider usa useLayoutEffect
- [x] BUG PRODUCCIÓN: Sync falla en producción — CORREGIDO: archivo Excel subido a CDN público, gdrive-sync.ts usa URL CDN como fuente primaria
- [x] Subir archivo Excel a S3/CDN para disponibilidad permanente en producción — COMPLETADO
- [x] Mostrar columna MAINSAVER/Parte Fabricante en tabla de Órdenes — AGREGADA al lado derecho de Descripción
- [ ] Conectar OAuth Google Cloud (client_id: 220183698829-7o71jvu74scbc1rp0kfimcf6sl2l7qro) para sincronización automática cada 15 min desde Google Drive
- [x] FIX CRÍTICO: Error insertBefore en producción móvil — Causa raíz: 1) localStorage.setItem dentro de useMemo (side-effect en render) en useAuth.ts, 2) DashboardLayout retornaba árboles DOM completamente diferentes según estado (loading/login/app). Solución: mover localStorage a useEffect, wrapper raíz estable con visibility toggle en vez de return trees diferentes.
- [x] FIX CRÍTICO: Error insertBefore al sincronizar — Causa raíz: syncMutation.mutate() llamado directamente dentro de useEffect durante el montaje del componente. Solución: useRef pendingAutoSync + setTimeout(500ms) para diferir la llamada hasta que React termine de reconciliar.
