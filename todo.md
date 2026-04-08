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
