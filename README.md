# KnomiDoc / NexusRest

Sistema de control documental de comprobantes **C31 (SIGEP)**: registro, actas de entrega, archivo físico,
préstamos por cuaderno y por nota, huella (demo), reportes y auditoría.

| Parte | Carpeta             | Tecnología                        |
| ----- | ------------------- | --------------------------------- |
| API   | `backend-knomidoc`  | NestJS 11 · TypeORM · PostgreSQL  |
| Web   | `frontend-knomidoc` | Vue 3 · Pinia · Tailwind 4 · Vite |

## Inicio rápido con Docker

```bash
cp .env.example .env        # edite POSTGRES_PASSWORD, JWT_TOKEN y ADMIN_PASSWORD
docker compose up -d --build
```

- Web: http://localhost:8080 · API: http://localhost:3000/api/v1 · Swagger: http://localhost:3000/apidoc
- Usuario inicial: `ADMIN_USERNAME` / `ADMIN_PASSWORD` (por defecto `admin` / `Cambiar2026*`). Cámbielo al ingresar.
- Datos persistentes en volúmenes: `pgdata` (base), `c31_storage` (escaneos), `uploads` (fotos).
- `VITE_API_BASE_URL` se incrusta al compilar el frontend: si publica el sistema en otro dominio,
  cámbielo en `.env` y reconstruya (`docker compose up -d --build frontend`).
- Respaldo de la base: `docker compose exec db pg_dump -U postgres knomidoc > respaldo.sql`.

## Desarrollo local (sin Docker)

Requisitos: Node 22+, PostgreSQL 14+.

```bash
# API
cd backend-knomidoc && cp .env.example .env && npm ci && npm run start:dev
# Web
cd frontend-knomidoc && cp .env.example .env && npm ci && npm run dev
```

El esquema se crea solo (`DB_SYNCHRONIZE=true`). Para bases ya existentes ejecute
`backend-knomidoc/docs/migracion-funcionarios-adjuntos.sql` (idempotente). Datos de ejemplo: `docs/datos-prueba.sql`.

## Perfiles (roles)

| Perfil              | Qué hace                                                                                |
| ------------------- | --------------------------------------------------------------------------------------- |
| ADMIN               | Usuarios, perfiles, parámetros de gestión; acceso total                                 |
| OPERADOR_ARCHIVOS   | Registra C31, **recibe** actas, ubica, notas a Auditoría                                |
| AUXILIAR_ARCHIVOS   | Apoya al archivista: registra C31, arma actas, ubica y rotula. No recibe ni anula actas |
| ENCARGADO_PRESTAMOS | Préstamos (cuaderno y nota), devoluciones, funcionarios                                 |
| REMITENTE_C31       | Arma e imprime sus propias actas de entrega; solo ve las suyas                          |
| CONSULTA_AVANZADA   | Solo lectura con filtros, reportes y exportación                                        |
| SOLO_LECTURA        | Consulta básica                                                                         |

Un usuario puede tener varios perfiles y trabaja con uno activo (como en el SIGEP).

## Flujos principales

- **Acta de entrega**: el remitente (o el archivista/auxiliar) arma el acta con comprobantes _En revisión_; se imprime con
  CITE (`GAMSL/ARCH/AE-N° 004/2026`). Al **aprobar** (recepción) el archivista, los comprobantes pasan a _En archivo_/_Observado_.
- **Selección rápida**: matriz de casilleros por N° de preventivo (50 por bloque, 5 columnas) para elegir muchos comprobantes
  a la vez en actas, préstamos y notas; admite pegar listas (`6, 12, 14-18`). Rojo = prestado.
- **Préstamo por cuaderno**: registra quién recibe y, al devolver, **quién devuelve** (puede ser el auxiliar del superior),
  ambos con verificación de huella (adaptador demo `LectorHuella`) o firma. Los comprobantes unidos (`grupo_union_id`)
  salen y vuelven juntos.
- **Préstamo por nota**: N° de nota/CITE automático (`NP-0001/AÑO`), buscable por N° o CITE.
- **Notas a Auditoría Interna**: modelo editable (A, VÍA, DE, REF., introducción, secciones con cuadros de preventivos,
  cierre). CITE automático `GAMSL/ARCH/AUD/OF-N° 004/2026`. PDF carta.
- **Gestión**: selector en la barra superior; por defecto la gestión activa (Parámetros de gestión). Filtra los listados.
- **Montos**: aceptan `12.345,67`, `12,345.67`, `2,600.00` (SIGEP), con o sin `Bs`, sin límite práctico de millones.
- **Beneficiarios**: el directorio está enlazado con los C31; al registrar un C31 el nombre se busca (sin importar
  mayúsculas/espacios) o se da de alta, y se guarda el vínculo `beneficiario_id`.
- **Códigos de barra** (Code128) y etiquetas para archivo físico; foto de perfil (URL o archivo).

## Variables de entorno

Ver `backend-knomidoc/.env.example` (comentado), `frontend-knomidoc/.env.example` y `.env.example` (Docker).
Imprescindibles: `DB_*`, `JWT_TOKEN`, `ADMIN_PASSWORD`. Para PDF: `ENTIDAD_*`, `CITE_PREFIJO`.

## Notas de producción

- `DB_SYNCHRONIZE=true` ajusta tablas automáticamente; con datos reales haga respaldo antes de actualizar o pase a `false`
  y aplique los scripts de `docs/`.
- Configure SMTP (`MAIL_*`) y ponga `EMAIL_VERIFICACION_OBLIGATORIA=true` para exigir confirmación de correo.
- Publique detrás de HTTPS (proxy inverso) y cambie todas las claves por defecto.
