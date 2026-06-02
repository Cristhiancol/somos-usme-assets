# DEPLOY.md

## Pre-Deploy Checklist
- [ ] Tests pasan: `npm run test` (si aplica o test manual completo)
- [ ] Build sin errores: `npm run build`
- [ ] No hay warnings TypeScript: `npm run check` (tsc --noEmit)
- [ ] DB backups actualizados y ejecutados.
- [ ] Cambios en DB (nuevos índices, constraints) ya fueron aplicados manualmente o mediante scripts si el entorno lo exige.

## Deploy a Producción
La aplicación Somos Usme se puede desplegar utilizando herramientas como Cloud Run, PM2, Docker o similares.

### 1. Despliegue con PM2 (Ejemplo local / VPS)
```bash
# 1. Bajar últimos cambios
git pull origin main

# 2. Instalar dependencias si hubo cambios
npm install

# 3. Compilar la aplicación (Frontend + Backend)
npm run build

# 4. Reiniciar PM2 para tomar el nuevo bundle
pm2 restart somos-usme

# 5. Monitorear logs para confirmar inicio exitoso
pm2 logs somos-usme
```

### 2. Despliegue Cloud (Vercel / Cloud Run)
```bash
# Generalmente el despliegue es automático vía CI/CD (GitHub Actions)
git push origin main
```
Luego monitorear el dashboard de despliegue correspondiente.

## Rollback (si algo falla)
Si la nueva versión introduce errores críticos:
```bash
# 1. Revertir último cambio en git
git revert HEAD --no-edit

# 2. Push para trigger de CI/CD, o deploy manual
git push origin main

# 3. Si la base de datos se corrompió, usar último dump
# mysql -u root -p < backups/pre-deploy-$(date +%Y%m%d).sql
```
