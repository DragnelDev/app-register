# Suite de testing automatizado · KnomiDoc / NexusRest

## Ejecutar

```bash
# Backend (Jest + Supertest). No requiere PostgreSQL: todo usa dobles en memoria.
cd backend-knomidoc && npm ci
npm test                 # unitarias (src/**/*.spec.ts)
npm run test:e2e         # integración HTTP con Supertest (test/*.e2e-spec.ts)
npm run test:cov         # cobertura

# Frontend (Vitest + Vue Test Utils + Pinia)
cd frontend-knomidoc && npm install      # añade vitest, @vue/test-utils, jsdom, coverage-v8
npm test
npm run test:cov
npm run type-check:test  # tipado de los tests (no afecta a `npm run build`)
```

## Qué cubre cada archivo

| Área | Archivo | Qué demuestra |
|---|---|---|
| Unicidad por gestión | `backend/src/comprobantes_c31/comprobantes_c31.service.unicidad.spec.ts` | Mismo N° rechazado en la misma gestión y aceptado en otra; sin distinguir mayúsculas; PREV y DEV con correlativos propios; anulado libera el N°; update excluye al propio registro |
| FSM de estados | `...service.estados.spec.ts` | Matriz `TRANSICIONES_MANUALES` fijada a mano + las 48 combinaciones ejecutadas; Anulado terminal; archivar exige folio y ubicación; motivos; pagos; remitente |
| Digitalización | `backend/src/uploads/c31-adjuntos.service.spec.ts`, `imagenes-pdf.util.spec.ts` | Firma de bytes (.exe disfrazado), máx. 40 imágenes, 80 MB total (inclusivo), orden, sin escrituras si falla, limpieza de huérfanos; pdfkit mockeado |
| Límite 15 MB / 40 archivos | `backend/test/digitalizacion.e2e-spec.ts` | multer: 15 MB exactos OK, +1 byte → 413; 41 archivos → 400 |
| Importación Excel | `backend/test/importacion-excel.e2e-spec.ts` | .xlsx real por multipart; una transacción por fila; fila que falla a mitad se revierte entera y las siguientes se importan; duplicados omitidos; simulación |
| RBAC | `backend/test/rbac.e2e-spec.ts` | JWT real + guards reales; 401/403 por perfil; el caso de uso nunca se ejecuta tras un 403; controles positivos |
| Utilidades Excel | `backend/src/comprobantes_c31/import-utils.spec.ts` | Montos, fechas, N° múltiples, encabezados |
| Selección masiva | `frontend/.../ActaEntregaModal.spec.ts` | "Marcar todos", contador y total en vivo, filtro, guardar, reset al reabrir, modo solo lectura |
| Digitalización UI | `frontend/.../DigitalizacionModal.spec.ts` | Previsualización, drag & drop, reordenar (botones y arrastre), orden de envío, límites, limpieza al cerrar |
| Adjuntos | `frontend/.../C31AdjuntosTab.spec.ts` | Botones ocultos sin permiso, subida, validaciones |
| Store / permisos | `frontend/src/stores/__tests__/auth.store.spec.ts` | Matriz de permisos de los 8 perfiles, cambio de perfil, persistencia, logout |
| Menú / botones | `AppSidebar.spec.ts`, `C31ListView.permisos.spec.ts` | Qué ve cada perfil y cómo cambia al cambiar de perfil sin recargar |

## Diseño: por qué no hay base de datos

- `test/helpers/fake-c31-db.ts`: BD en memoria que **implementa** las operaciones reales (guardar, buscar, contar, la consulta de unicidad), no un mock ciego.
- `test/helpers/fake-import-ds.ts`: `transaction()` con COMMIT/ROLLBACK reales por fila.
- SQLite/pg-mem no se usan: las entidades usan tipos exclusivos de PostgreSQL (`timestamp`, identity, `UPPER()` con índices) y darían falsos verdes/rojos.
  Si se quiere un nivel adicional contra PostgreSQL real, añadir `testcontainers` y ejecutar las mismas especificaciones con el `DataSource` real (fuera del alcance de esta entrega).

## Hallazgos de la lectura del código

1. **No existe `tipo_gasto`**: la unicidad real es `gestión + N° de preventivo` y, por separado, `gestión + N° de devengado` (el tipo C31 se deriva de cuál se informa).
2. **No existen "fojas útiles"**: el contador dinámico del modal de actas es `N marcado(s) · Total Bs X`.
3. **Probable defecto (test rojo esperado)**: subir a `/import` un archivo que no es Excel debería dar 400; `exceljs` lanza y el servicio no lo captura → 500.
4. **Probable defecto (test rojo esperado)**: la detección de la fila de encabezado no quita tildes; "Descripción" → `DESCRIPCIÓN` no contiene `DESCRIPCION` y la hoja se descarta.
5. Hay ~21 specs generados por Nest (`should be defined` sin providers) que fallan; conviene borrarlos o completarlos.
