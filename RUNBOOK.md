# RUNBOOK.md

## Emergencias Comunes y Soluciones

### 1. Sincronización Lenta o Congelada (> 60s)
**Síntoma:** El botón de Sync se queda cargando y nunca termina. En la UI indica "Sincronizando...".
**Causa:** Bloqueo de API de Google Drive, deadlock en base de datos, o timeout de red silencioso.
**Solución:**
1. Revisar los logs del servidor (o `.manus-logs/browserConsole.log` en entorno dev).
2. El nuevo sistema de monitoreo (`monitoring.ts`) arroja un error `Sync deadlock detected` automáticamente a los 60s y libera el estado. 
3. Si el estado en la UI se sigue viendo atascado, ejecutar en DB:
   ```sql
   UPDATE sync_logs SET status='error' WHERE status='running' AND startedAt < DATE_SUB(NOW(), INTERVAL 1 MINUTE);
   ```
4. Reintentar sincronización.

### 2. Errores de Rate Limit (HTTP 429)
**Síntoma:** El chatbot arroja "Rate limit exceeded" o no busca.
**Causa:** Un usuario está enviando demasiadas peticiones (DDoS) o un script automatizado está saturando.
**Solución:**
- Es el comportamiento esperado. Protege la base de datos y memoria.
- Si es un falso positivo para usuarios normales, editar `server/_core/rateLimiter.ts` y ajustar `tokensPerSecond` o `burst`. Re-desplegar la app.

### 3. La Aplicación No Carga (HTTP 500 o Timeout)
**Síntoma:** Pantalla blanca, errores genéricos 500.
**Solución:**
1. Verificar estado del servidor (ej. `pm2 status`).
2. Reiniciar el proceso: `pm2 restart somos-usme`.
3. Validar conectividad a base de datos: `mysql -u usuario -p -e "SELECT 1"`.
4. Validar espacio en disco (los logs crecen rápido sin límites, verificar que `/tmp` o logs de PM2 no hayan saturado el disco).

### 4. Problemas de Permisos de Google (OAuth Token Revocado)
**Síntoma:** Fallan descargas de Drive o se extraen URLs nulas sistemáticamente.
**Solución:**
- Re-autorizar ingresando a `/sync` en la plataforma web (renovará el Access Token).
- Si afecta a todos los usuarios/servicios, ir a Google Cloud Console, verificar que las credenciales sigan válidas y no hayan expirado en modo "Testing".

## Recuperación Ante Desastres

### 1. Pérdida Masiva de Base de Datos
1. Restaurar del backup automatizado diario:
   ```bash
   mysql -u usuario -p base_de_datos < /ruta/al/backup.sql
   ```
2. Ejecutar sincronización manual (`/api/sync-drive`) para reponer datos desde Google Sheets a la base de datos (inventario, órdenes y consumo están respaldados primariamente en Google Sheets).

### 2. Corrupción de Índices (Lentitud Extrema)
Si la app corre muy lento, forzar reconstrucción de tablas:
```sql
ALTER TABLE inventory_items ENGINE=InnoDB;
ALTER TABLE purchase_orders ENGINE=InnoDB;
```
