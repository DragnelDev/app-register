-- Migración: Funcionarios, préstamos por FK, borrador de notas y digitalización C31.
-- Con `synchronize: true` TypeORM crea tablas/columnas nuevas solo en desarrollo.
-- En producción: desactivar synchronize y ejecutar este script (idempotente).
-- Hacer respaldo (pg_dump) antes de ejecutar.

BEGIN;

-- 1) Directorio de funcionarios (sin acceso al sistema)
CREATE TABLE IF NOT EXISTS funcionarios (
  id                 INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ci                 VARCHAR(20)  NOT NULL,
  nombres            VARCHAR(100) NOT NULL,
  apellidos          VARCHAR(100) NOT NULL,
  cargo              VARCHAR(150) NOT NULL,
  unidad_oficina     VARCHAR(150) NOT NULL,
  telefono           VARCHAR(30),
  estado             VARCHAR(10)  NOT NULL DEFAULT 'ACTIVO',
  fecha_creacion     TIMESTAMP NOT NULL DEFAULT now(),
  fecha_modificacion TIMESTAMP NOT NULL DEFAULT now(),
  fecha_eliminacion  TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_funcionarios_ci
  ON funcionarios (ci) WHERE fecha_eliminacion IS NULL;
CREATE INDEX IF NOT EXISTS idx_funcionarios_busqueda
  ON funcionarios (apellidos, nombres);

-- 2) Préstamos por NOTA: FK a funcionario, referencia/destinatario y estado BORRADOR
ALTER TABLE prestamos_nota
  ADD COLUMN IF NOT EXISTS funcionario_id INTEGER REFERENCES funcionarios(id),
  ADD COLUMN IF NOT EXISTS referencia TEXT,
  ADD COLUMN IF NOT EXISTS destinatario VARCHAR(200);
ALTER TABLE prestamos_nota
  ALTER COLUMN institucion_solicitante DROP NOT NULL,
  ALTER COLUMN funcionario_responsable DROP NOT NULL,
  ALTER COLUMN estado_prestamo SET DEFAULT 'BORRADOR';
-- Las notas existentes conservan su estado (ENTREGADO / DEVUELTO).

-- 3) Préstamos por CUADERNO: FK a funcionario; solicitante (usuario) queda como histórico
ALTER TABLE prestamos_cuaderno
  ADD COLUMN IF NOT EXISTS funcionario_id INTEGER REFERENCES funcionarios(id);
ALTER TABLE prestamos_cuaderno ALTER COLUMN solicitante_id DROP NOT NULL;

-- 3b) Migración de datos históricos: crea un funcionario por cada solicitante distinto
--     (CI provisional 'MIG-<id usuario>' / 'MIG-N-<n>' a regularizar desde el módulo).
INSERT INTO funcionarios (ci, nombres, apellidos, cargo, unidad_oficina, estado)
SELECT 'MIG-' || u.id,
       split_part(u.nombre_completo, ' ', 1),
       COALESCE(NULLIF(trim(substr(u.nombre_completo, length(split_part(u.nombre_completo, ' ', 1)) + 1)), ''), '-'),
       COALESCE(u.cargo, 'Sin cargo'),
       COALESCE(u.unidad_o_area, 'Sin unidad'),
       'ACTIVO'
FROM usuarios u
WHERE u.id IN (SELECT DISTINCT solicitante_id FROM prestamos_cuaderno WHERE solicitante_id IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM funcionarios f WHERE f.ci = 'MIG-' || u.id);

UPDATE prestamos_cuaderno p
SET funcionario_id = f.id
FROM funcionarios f
WHERE p.funcionario_id IS NULL
  AND p.solicitante_id IS NOT NULL
  AND f.ci = 'MIG-' || p.solicitante_id;

-- Notas históricas: un funcionario por cada nombre distinto (texto libre)
WITH nombres AS (
  SELECT DISTINCT funcionario_responsable AS nombre,
         (array_agg(institucion_solicitante))[1] AS unidad
  FROM prestamos_nota
  WHERE funcionario_id IS NULL AND funcionario_responsable IS NOT NULL
  GROUP BY funcionario_responsable
), numerados AS (
  SELECT nombre, unidad, row_number() OVER (ORDER BY nombre) AS n FROM nombres
)
INSERT INTO funcionarios (ci, nombres, apellidos, cargo, unidad_oficina, estado)
SELECT 'MIG-N-' || n,
       split_part(nombre, ' ', 1),
       COALESCE(NULLIF(trim(substr(nombre, length(split_part(nombre, ' ', 1)) + 1)), ''), '-'),
       'Sin cargo',
       COALESCE(unidad, 'Sin unidad'),
       'ACTIVO'
FROM numerados
ON CONFLICT DO NOTHING;

-- Enlazar notas históricas por coincidencia exacta del nombre completo
UPDATE prestamos_nota p
SET funcionario_id = f.id
FROM funcionarios f
WHERE p.funcionario_id IS NULL
  AND f.ci LIKE 'MIG-N-%'
  AND p.funcionario_responsable = (f.nombres || CASE WHEN f.apellidos = '-' THEN '' ELSE ' ' || f.apellidos END);

-- 4) Digitalización de C31
ALTER TABLE comprobantes_c31
  ADD COLUMN IF NOT EXISTS archivo_adjunto_url TEXT,
  ADD COLUMN IF NOT EXISTS fecha_digitalizacion TIMESTAMP;

CREATE TABLE IF NOT EXISTS c31_adjuntos (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  comprobante_id  INTEGER NOT NULL REFERENCES comprobantes_c31(id) ON DELETE CASCADE,
  tipo            VARCHAR(12) NOT NULL DEFAULT 'C31',
  nombre_original VARCHAR(255) NOT NULL,
  nombre_archivo  VARCHAR(100) NOT NULL,
  mime_type       VARCHAR(100) NOT NULL,
  tamano          INTEGER NOT NULL,
  fecha_carga     TIMESTAMP NOT NULL DEFAULT now(),
  subido_por_id   INTEGER REFERENCES usuarios(id)
);
CREATE INDEX IF NOT EXISTS idx_c31_adjuntos_comprobante ON c31_adjuntos (comprobante_id);

-- 5) Búsqueda por glosa/detalle e índices de filtro (ILIKE '%texto%')
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_c31_descripcion_trgm
  ON comprobantes_c31 USING gin (descripcion gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_c31_gestion ON comprobantes_c31 (gestion);
CREATE INDEX IF NOT EXISTS idx_c31_prev_numero_trgm
  ON c31_preventivos USING gin (numero_preventivo gin_trgm_ops);

COMMIT;

-- ───────────── Unión de comprobantes (PREV + PREV, PREV + DEV) ─────────────
-- Cada comprobante conserva su registro; los unidos comparten grupo_union_id.
ALTER TABLE comprobantes_c31 ADD COLUMN IF NOT EXISTS grupo_union_id varchar(36);
CREATE INDEX IF NOT EXISTS idx_c31_grupo_union ON comprobantes_c31 (grupo_union_id);

-- ───────────── Préstamos por cuaderno en lote ─────────────
-- Los comprobantes que salen juntos comparten lote_id y se devuelven todos a la vez.
ALTER TABLE prestamos_cuaderno ADD COLUMN IF NOT EXISTS lote_id varchar(36);
CREATE INDEX IF NOT EXISTS idx_prestamos_cuaderno_lote ON prestamos_cuaderno (lote_id);

-- ───────────── Perfiles múltiples por usuario (estilo SIGEP) ─────────────
CREATE TABLE IF NOT EXISTS usuario_perfiles (
  id              integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  usuario_id      integer NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  rol             varchar(30) NOT NULL,
  fecha_creacion  timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_usuario_perfil UNIQUE (usuario_id, rol)
);
-- Cada usuario conserva su rol actual como primer perfil
INSERT INTO usuario_perfiles (usuario_id, rol)
SELECT id, rol FROM usuarios
ON CONFLICT (usuario_id, rol) DO NOTHING;
-- CONSULTA_EXTERNA pasa a llamarse SOLO_LECTURA (el rol anterior sigue siendo válido)
UPDATE usuarios SET rol = 'SOLO_LECTURA' WHERE rol = 'CONSULTA_EXTERNA';
UPDATE usuario_perfiles SET rol = 'SOLO_LECTURA' WHERE rol = 'CONSULTA_EXTERNA';

-- ───────────── Directorio de beneficiarios ─────────────
CREATE TABLE IF NOT EXISTS beneficiarios (
  id                  integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  tipo_persona        varchar(10)  NOT NULL DEFAULT 'NATURAL',
  nombre              varchar(200) NOT NULL,
  tipo_documento      varchar(15)  NOT NULL DEFAULT 'SIN_DOCUMENTO',
  numero_documento    varchar(30),
  telefono            varchar(30),
  email               varchar(100),
  direccion           varchar(200),
  estado              varchar(10)  NOT NULL DEFAULT 'ACTIVO',
  fecha_creacion      timestamp NOT NULL DEFAULT now(),
  fecha_modificacion  timestamp NOT NULL DEFAULT now(),
  fecha_eliminacion   timestamp,
  creado_por_id       integer REFERENCES usuarios(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_beneficiarios_documento
  ON beneficiarios (tipo_documento, UPPER(numero_documento))
  WHERE numero_documento IS NOT NULL AND tipo_documento <> 'SIN_DOCUMENTO' AND fecha_eliminacion IS NULL;
CREATE INDEX IF NOT EXISTS idx_beneficiarios_nombre_trgm ON beneficiarios USING gin (nombre gin_trgm_ops);

ALTER TABLE c31_beneficiarios ADD COLUMN IF NOT EXISTS beneficiario_id integer REFERENCES beneficiarios(id);
CREATE INDEX IF NOT EXISTS idx_c31_beneficiarios_beneficiario ON c31_beneficiarios (beneficiario_id);

-- Migra los nombres ya registrados al directorio (uno por nombre distinto) y los vincula.
-- Sin documento: se completa luego desde el módulo Beneficiarios.
INSERT INTO beneficiarios (nombre, tipo_persona)
SELECT DISTINCT ON (clave) clave,
       CASE WHEN clave ~ '(S\.?R\.?L|S\.?A\.?|LTDA|EMPRESA|ASOCIACI|COOPERATIVA|FUNDACI)' THEN 'JURIDICA' ELSE 'NATURAL' END
FROM (
  SELECT UPPER(REGEXP_REPLACE(TRIM(nombre_beneficiario), '\s+', ' ', 'g')) AS clave
  FROM c31_beneficiarios
  WHERE nombre_beneficiario IS NOT NULL AND TRIM(nombre_beneficiario) <> ''
) t
WHERE NOT EXISTS (
  SELECT 1 FROM beneficiarios b WHERE UPPER(REGEXP_REPLACE(TRIM(b.nombre), '\s+', ' ', 'g')) = t.clave
)
ORDER BY clave;

UPDATE c31_beneficiarios cb
SET beneficiario_id = b.id
FROM beneficiarios b
WHERE cb.beneficiario_id IS NULL
  AND UPPER(REGEXP_REPLACE(TRIM(cb.nombre_beneficiario), '\s+', ' ', 'g')) = UPPER(REGEXP_REPLACE(TRIM(b.nombre), '\s+', ' ', 'g'));

-- ───────────── Huella demo (adaptador de lector) ─────────────
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS huella_plantilla text;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS huella_registrada_en timestamp;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS huella_lector varchar(30);

-- ───────────── Foto de perfil ─────────────
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto text;

-- ───────────── Actas de entrega creadas por el remitente ─────────────
ALTER TABLE actas_entrega ADD COLUMN IF NOT EXISTS creado_por_id integer REFERENCES usuarios(id);

-- ───────────── Cuaderno: quién devuelve y cómo se verificó ─────────────
ALTER TABLE prestamos_cuaderno ADD COLUMN IF NOT EXISTS devuelto_por_funcionario_id integer REFERENCES funcionarios(id);
ALTER TABLE prestamos_cuaderno ADD COLUMN IF NOT EXISTS metodo_verificacion_devolucion varchar(20);

-- ───────────── Notas a Auditoría Interna ─────────────
CREATE TABLE IF NOT EXISTS notas_auditoria (
  id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  cite varchar(80) NOT NULL UNIQUE,
  fecha date NOT NULL,
  destinatario jsonb NOT NULL,
  via jsonb,
  remitente jsonb NOT NULL,
  referencia text NOT NULL,
  introduccion text NOT NULL DEFAULT '',
  secciones jsonb NOT NULL DEFAULT '[]',
  cierre text NOT NULL DEFAULT '',
  gestion integer,
  creado_por_id integer REFERENCES usuarios(id),
  fecha_creacion timestamp NOT NULL DEFAULT now(),
  fecha_modificacion timestamp NOT NULL DEFAULT now(),
  fecha_eliminacion timestamp
);

-- Notas a Auditoría vinculadas a notas de préstamo
ALTER TABLE notas_auditoria ADD COLUMN IF NOT EXISTS notas_prestamo jsonb NOT NULL DEFAULT '[]';

-- Ronda D: evidencia (imagen del cuaderno firmado) por préstamo, salida y devolución
ALTER TABLE prestamos_cuaderno ADD COLUMN IF NOT EXISTS evidencia_salida varchar(100);
ALTER TABLE prestamos_cuaderno ADD COLUMN IF NOT EXISTS evidencia_salida_mime varchar(40);
ALTER TABLE prestamos_cuaderno ADD COLUMN IF NOT EXISTS evidencia_devolucion varchar(100);
ALTER TABLE prestamos_cuaderno ADD COLUMN IF NOT EXISTS evidencia_devolucion_mime varchar(40);
