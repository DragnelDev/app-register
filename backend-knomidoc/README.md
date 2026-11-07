# KnomiDoc — API (NestJS)

API REST del sistema de control documental de comprobantes C31. Documentación general, flujos, perfiles y
Docker en el [README de la raíz](../README.md).

## Ejecutar

```bash
cp .env.example .env     # complete DB_*, JWT_TOKEN, ADMIN_PASSWORD
npm ci
npm run start:dev        # http://localhost:3000/api/v1  ·  Swagger: /apidoc
npm run build && npm run start:prod
```

## Módulos principales

`comprobantes_c31` · `actas-entrega` · `notas-auditoria` · `beneficiarios` · `funcionarios` (huella demo) ·
`prestamos-cuaderno` · `prestamos-nota` · `carpetas/estantes/depositos` (archivo físico) · `parametros-gestion` ·
`reportes` · `auditoria` · `usuarios/auth` (multi-perfil, JWT).

## Scripts SQL (`docs/`)

- `migracion-funcionarios-adjuntos.sql`: columnas y tablas nuevas para bases existentes (idempotente).
- `migracion-estados-pagos.sql`, `datos-prueba.sql`.

## Pruebas

```bash
npm test
```
