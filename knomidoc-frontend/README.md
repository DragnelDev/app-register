# KnomiDoc — Frontend (Vue 3 + TypeScript)

Plantilla de frontend para **KnomiDoc**, sistema de registro, custodia y trazabilidad de
comprobantes C31 y control de préstamos. Backend de referencia: NestJS + PostgreSQL (ver
`KnomiDoc_Modelo_Entidad_Relacion_MER.pdf`).

## Stack

- Vue 3 (`<script setup>`) + TypeScript
- Vite
- Vue Router 4 (rutas protegidas por rol: `ADMIN`, `REGISTRADOR`, `CONSULTA`)
- Pinia (stores de sesión, C31 y préstamos)
- Axios (interceptores JWT)
- Tailwind CSS + SCSS

## Empezar

```bash
npm install
cp .env.example .env   # ajusta VITE_API_BASE_URL a tu backend NestJS
npm run dev
```

## Estructura

Sigue el layout modular acordado: `components/ui` (genéricos), `components/layout`
(navbar/sidebar/footer), `router`, `stores`, `services`, `types`, y `modules/<dominio>`
con `components/` y `views/` propios por módulo (auth, dashboard, notas-entrega,
c31-gastos, prestamos).

## Reglas de negocio reflejadas en la UI

- **Notas de entrega**: registro con imagen de respaldo (máx. 5MB, validado en el modal).
- **Comprobantes C31**: formulario dinámico (`FormC31Dynamic.vue`) que soporta preventivos
  y devengados "2 en 1", múltiples beneficiarios, cheques opcionales y distribución en
  hasta 5 carpetas (`c31_carpetas_ubicacion`).
- **Aprobaciones**: vista exclusiva para `ADMIN` (`C31AprobacionesView.vue`) para aprobar
  o rechazar comprobantes `PENDIENTE`.
- **Préstamos**: dos modos independientes —
  - _Cuaderno Bitácora_: préstamo individual rápido por gestión.
  - _Nota/Oficio Oficial_: préstamo en lote de comprobantes y/o carpetas completas.
- **Usuarios**: registro y control de acceso, visible y accesible **solo para `ADMIN`**
  (`modules/usuarios`). Un `ADMIN` no puede desactivar su propia cuenta desde la UI.

## Control de acceso por rol (solo ADMIN en `/usuarios`)

La restricción vive en dos capas, y ambas son necesarias:

1. **Frontend** (`router/routes.ts` + `router/index.ts`): la ruta `/usuarios` declara
   `meta: { roles: ['ADMIN'] }`. El guard global resuelve el perfil del usuario (`/auth/me`)
   si aún no está en memoria — esto evita que un refresh de página con el token aún válido
   pero sin `usuario` cargado se salte el chequeo de rol. Cualquier rol distinto de `ADMIN`
   es redirigido a `/` (dashboard) y el ítem "Usuarios" ni siquiera aparece en el sidebar.
2. **Backend (pendiente de implementar en NestJS)**: el frontend NUNCA es la única barrera
   de seguridad. El controlador de `/usuarios` debe protegerse con un guard de rol real
   (ej. `@UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN')`), porque cualquiera puede
   llamar a la API directamente sin pasar por la UI.

## Endpoints esperados para el módulo de usuarios

- `GET /usuarios` — lista paginada (protegido, solo ADMIN)
- `POST /usuarios` — registrar usuario nuevo (`nombreCompleto`, `email`, `password`, `rol`)
- `PATCH /usuarios/:id` — editar datos/rol (y opcionalmente resetear password)
- `PATCH /usuarios/:id/estado` — activar/desactivar cuenta (`{ estado: boolean }`)
- `GET /auth/me` — perfil del usuario autenticado (usado para resolver el rol tras un refresh)

## Conectar con el backend NestJS

Todos los servicios en `src/services/` asumen los endpoints REST descritos en el MER
(`/auth`, `/notas-entrega`, `/comprobantes-c31`, `/carpetas`, `/prestamos-cuaderno`,
`/prestamos-nota`). Ajusta las rutas si tu controlador NestJS usa otros nombres.

## Pendientes sugeridos

- Conectar `C31FilterBar` con búsqueda por preventivo/devengado si el backend lo expone.
- Añadir manejo de expiración de token (refresh token) si el backend lo soporta.
- Tests unitarios (Vitest) para stores y formularios dinámicos.
