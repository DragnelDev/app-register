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
