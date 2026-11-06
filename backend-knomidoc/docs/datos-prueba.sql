-- Datos de prueba (PostgreSQL) para KnomiDoc / NexusRest.
-- Requisito: las tablas ya existen (arranque con synchronize:true o migracion-funcionarios-adjuntos.sql).
-- Ejecutar UNA vez. Al final hay un bloque (comentado) para borrar estos datos.
-- Los comprobantes de prueba se marcan con 'SEED:Sxx' en observaciones.
-- Nota: no inserta usuarios; los campos creado_por/registrado_por quedan NULL.
-- Nota: no simula digitalización (no hay archivos reales); súbelos desde la pestaña "Digitalización".

BEGIN;

-- ───────────────────────── 1) Archivo físico ─────────────────────────
INSERT INTO depositos (codigo, nombre, ubicacion, descripcion, activo) VALUES
  ('DEP-01', 'Archivo Central',  'Planta baja, edificio municipal', 'Archivo principal de comprobantes C31', true),
  ('DEP-02', 'Depósito Anexo',   'Segundo piso, ala este',          'Gestiones anteriores',                      true);

INSERT INTO estantes (codigo, descripcion, niveles, deposito_id, activo) VALUES
  ('EST-A1', 'Estante gestión 2025', 5, (SELECT id FROM depositos WHERE codigo = 'DEP-01'), true),
  ('EST-A2', 'Estante gestión 2026', 5, (SELECT id FROM depositos WHERE codigo = 'DEP-01'), true),
  ('EST-B1', 'Estante de reserva',   4, (SELECT id FROM depositos WHERE codigo = 'DEP-02'), true);

INSERT INTO carpetas (codigo_carpeta, ubicacion_fisica, estado_fisico, estante_id) VALUES
  ('CARP-2025-01', 'DEP-01 / EST-A1 / CARP-2025-01', 'EN_ARCHIVO', (SELECT id FROM estantes WHERE codigo = 'EST-A1')),
  ('CARP-2025-02', 'DEP-01 / EST-A1 / CARP-2025-02', 'EN_ARCHIVO', (SELECT id FROM estantes WHERE codigo = 'EST-A1')),
  ('CARP-2026-01', 'DEP-01 / EST-A2 / CARP-2026-01', 'EN_ARCHIVO', (SELECT id FROM estantes WHERE codigo = 'EST-A2')),
  ('CARP-2026-02', 'DEP-01 / EST-A2 / CARP-2026-02', 'EN_ARCHIVO', (SELECT id FROM estantes WHERE codigo = 'EST-A2')),
  ('CARP-2026-03', 'DEP-02 / EST-B1 / CARP-2026-03', 'EN_ARCHIVO', (SELECT id FROM estantes WHERE codigo = 'EST-B1'));

-- ───────────────────────── 2) Funcionarios ─────────────────────────
INSERT INTO funcionarios (ci, nombres, apellidos, cargo, unidad_oficina, telefono, estado) VALUES
  ('4567890', 'Pedro',         'Gómez Rojas',      'Auditor Interno',                 'Auditoría Interna',                '72345678', 'ACTIVO'),
  ('5678901', 'María Fernanda','Quispe Mamani',    'Jefa de Auditoría',               'Auditoría Interna',                '71234567', 'ACTIVO'),
  ('6789012', 'Luis Alberto',  'Vargas Cruz',      'Director de Obras Públicas',      'Obras Públicas',                   '76543210', 'ACTIVO'),
  ('7890123', 'Carla',         'Rojas Mendoza',    'Responsable de Presupuestos',     'Dirección Administrativa Financiera', NULL,    'ACTIVO'),
  ('8901234', 'Jorge',         'Choque Flores',    'Técnico Legal',                   'Asesoría Legal',                   '70011223', 'ACTIVO'),
  ('9012345', 'Ana Lucía',     'Torrez Salinas',   'Secretaria Municipal',            'Secretaría Municipal',             NULL,     'ACTIVO'),
  ('3456789', 'Roberto',       'Mamani Condori',   'Contador',                        'Contabilidad',                     '68899776', 'ACTIVO'),
  ('2345678', 'Sofía',         'Alvarado Paz',     'Asesora de Despacho',             'Alcaldía',                         NULL,     'INACTIVO');

-- ───────────────────────── 3) Comprobantes C31 ─────────────────────────
-- Los N° de preventivo se repiten entre gestiones (1001, 1002, 1003, 1004 en 2025 y 2026).
CREATE TEMP TABLE seed_c31 (
  clave text, tipo text, gestion int, numero text, monto numeric(14,2), fecha date,
  descripcion text, folio text, estado text, beneficiario text, carpeta text, parte int
) ON COMMIT DROP;

INSERT INTO seed_c31 VALUES
 ('S01','CON_IMPUTACION',2025,'1001',  3250.00,'2025-02-10','Pago de combustible para vehículos oficiales enero 2025','001','ARCHIVADO','Surtidores Andinos S.R.L.','CARP-2025-01',1),
 ('S02','CON_IMPUTACION',2025,'1002',  1800.50,'2025-03-04','Pasajes interprovinciales comisión técnica',            '002','ARCHIVADO','Flota Bolivia S.A.',        'CARP-2025-01',1),
 ('S03','CON_IMPUTACION',2025,'1003', 15200.00,'2025-05-20','Adquisición de material de escritorio',                  '003','ARCHIVADO','Papelería Central',         'CARP-2025-02',1),
 ('S04','SIN_IMPUTACION',2025,'501',    980.00,'2025-06-11','Pago de servicio de agua potable mayo 2025',            '004','ARCHIVADO','COSAALT',                   'CARP-2025-02',1),
 ('S14','CON_IMPUTACION',2025,'1004',  2100.00,'2025-09-12','Pasajes terrestres para capacitación',                  '005','ARCHIVADO','Flota Bolivia S.A.',        'CARP-2025-02',2),
 ('S05','CON_IMPUTACION',2026,'1001',  4100.00,'2026-01-15','Pago de combustible para maquinaria pesada enero 2026', '001','ARCHIVADO','Surtidores Andinos S.R.L.','CARP-2026-01',1),
 ('S06','CON_IMPUTACION',2026,'1002',  2750.00,'2026-02-03','Pasajes aéreos para capacitación SIGEP',                '002','ARCHIVADO','Boliviana de Aviación',     'CARP-2026-01',1),
 ('S07','CON_IMPUTACION',2026,'1003', 22800.00,'2026-03-18','Mantenimiento de vehículos oficiales',                  '003','PRESTADO', 'Taller Automotriz El Sur',  'CARP-2026-01',2),
 ('S08','SIN_IMPUTACION',2026,'612',   1450.75,'2026-04-07','Pago de energía eléctrica marzo 2026',                  '004','PRESTADO', 'ENDE Distribución',         'CARP-2026-02',1),
 ('S09','CON_IMPUTACION',2026,'1004',  8900.00,'2026-05-22','Refrigerios para taller de capacitación',               '005','ARCHIVADO','Catering Sabores',          'CARP-2026-02',1),
 ('S10','CON_IMPUTACION',2026,'1005',  6400.00,'2026-06-30','Combustible para comisión de fiscalización',            NULL, 'EN_REVISION','Surtidores Andinos S.R.L.',NULL,NULL),
 ('S11','CON_IMPUTACION',2026,'1006',  3100.00,'2026-07-14','Pasajes terrestres para personal técnico',              '006','ARCHIVADO','Flota Bolivia S.A.',        'CARP-2026-03',1),
 ('S12','CON_IMPUTACION',2026,'1007',  5000.00,'2026-08-02','Material de limpieza y aseo',                           '007','ARCHIVADO','Distribuidora Limpia',      'CARP-2026-03',1),
 ('S13','CON_IMPUTACION',2026,'1008', 12000.00,'2026-09-09','Combustible gestión septiembre 2026',                   NULL, 'EN_TRAMITE','Surtidores Andinos S.R.L.',NULL,NULL);

INSERT INTO comprobantes_c31
  (gestion, tipo_c31, monto_total, fecha_elaboracion, descripcion, numero_folio, estado_fisico, ubicacion_fisica, observaciones)
SELECT gestion, tipo, monto, fecha, descripcion, folio, estado,
       CASE WHEN carpeta IS NULL THEN 'ARCHIVOS GAMSL' ELSE 'ARCHIVOS GAMSL / ' || carpeta END,
       'SEED:' || clave
FROM seed_c31;

INSERT INTO c31_preventivos (comprobante_id, numero_preventivo)
SELECT c.id, s.numero FROM seed_c31 s
JOIN comprobantes_c31 c ON c.observaciones = 'SEED:' || s.clave
WHERE s.tipo = 'CON_IMPUTACION';

INSERT INTO c31_devengados (comprobante_id, numero_devengado)
SELECT c.id, s.numero FROM seed_c31 s
JOIN comprobantes_c31 c ON c.observaciones = 'SEED:' || s.clave
WHERE s.tipo = 'SIN_IMPUTACION';

INSERT INTO c31_beneficiarios (comprobante_id, nombre_beneficiario)
SELECT c.id, s.beneficiario FROM seed_c31 s
JOIN comprobantes_c31 c ON c.observaciones = 'SEED:' || s.clave;

INSERT INTO c31_carpetas_ubicacion (comprobante_id, carpeta_id, numero_parte)
SELECT c.id, k.id, s.parte FROM seed_c31 s
JOIN comprobantes_c31 c ON c.observaciones = 'SEED:' || s.clave
JOIN carpetas k ON k.codigo_carpeta = s.carpeta
WHERE s.carpeta IS NOT NULL;

-- ───────────────────────── 4) Préstamos por CUADERNO ─────────────────────────
-- S08: pendiente y VENCIDO (devolución estimada hace 3 días)
INSERT INTO prestamos_cuaderno
  (comprobante_id, funcionario_id, area_unidad, fecha_hora_salida, fecha_devolucion_estimada, devuelto, metodo_verificacion, observaciones)
SELECT (SELECT id FROM comprobantes_c31 WHERE observaciones = 'SEED:S08'),
       (SELECT id FROM funcionarios WHERE ci = '7890123'),
       'Dirección Administrativa Financiera', now() - interval '10 days', current_date - 3, false, 'FIRMA_MANUAL',
       'Consulta para conciliación de servicios básicos';

-- S09: devuelto conforme
INSERT INTO prestamos_cuaderno
  (comprobante_id, funcionario_id, area_unidad, fecha_hora_salida, fecha_devolucion_estimada, fecha_hora_devolucion,
   devuelto, metodo_verificacion, condicion_devolucion, observaciones)
SELECT (SELECT id FROM comprobantes_c31 WHERE observaciones = 'SEED:S09'),
       (SELECT id FROM funcionarios WHERE ci = '3456789'),
       'Contabilidad', now() - interval '20 days', current_date - 15, now() - interval '18 days',
       true, 'FIRMA_MANUAL', 'CONFORME', 'Revisión contable';

-- S05: devuelto con novedad
INSERT INTO prestamos_cuaderno
  (comprobante_id, funcionario_id, area_unidad, fecha_hora_salida, fecha_devolucion_estimada, fecha_hora_devolucion,
   devuelto, metodo_verificacion, condicion_devolucion, observaciones_devolucion, observaciones)
SELECT (SELECT id FROM comprobantes_c31 WHERE observaciones = 'SEED:S05'),
       (SELECT id FROM funcionarios WHERE ci = '8901234'),
       'Asesoría Legal', now() - interval '30 days', current_date - 25, now() - interval '27 days',
       true, 'FIRMA_MANUAL', 'CON_NOVEDAD', 'Se devolvió con una hoja de respaldo desprendida', 'Revisión legal de contrato';

-- ───────────────────────── 5) Préstamos por NOTA ─────────────────────────
-- ENTREGADO: nota de Auditoría por S07 (el comprobante ya figura PRESTADO)
INSERT INTO prestamos_nota
  (comprobante_id, numero_nota_solicitud, funcionario_id, institucion_solicitante, funcionario_responsable,
   referencia, destinatario, fecha_prestamo, fecha_devolucion_estimada, estado_prestamo, observaciones)
SELECT (SELECT id FROM comprobantes_c31 WHERE observaciones = 'SEED:S07'),
       'NOTA-AUD-045/2026', f.id, 'Auditoría Interna', f.nombres || ' ' || f.apellidos,
       'REMISIÓN DE COMPROBANTES C31 EN CALIDAD DE PRÉSTAMO (RESPUESTA A SU NOTA NOTA-AUD-045/2026)',
       f.nombres || ' ' || f.apellidos, current_date - 12, current_date + 18, 'ENTREGADO',
       'Auditoría de la gestión 2026'
FROM funcionarios f WHERE f.ci = '4567890';

-- BORRADOR: nota de Obras Públicas con S11 y S12 (siguen ARCHIVADO hasta aprobar)
INSERT INTO prestamos_nota
  (comprobante_id, numero_nota_solicitud, funcionario_id, institucion_solicitante, funcionario_responsable,
   referencia, destinatario, fecha_prestamo, fecha_devolucion_estimada, estado_prestamo, observaciones)
SELECT c.id, 'NOTA-OBR-012/2026', f.id, 'Obras Públicas', f.nombres || ' ' || f.apellidos,
       'SOLICITUD DE COMPROBANTES DE PASAJES Y MATERIAL PARA RENDICIÓN DE CUENTAS',
       f.nombres || ' ' || f.apellidos, current_date, current_date + 10, 'BORRADOR',
       'Pendiente de aprobación'
FROM comprobantes_c31 c, funcionarios f
WHERE c.observaciones IN ('SEED:S11', 'SEED:S12') AND f.ci = '6789012';

-- DEVUELTO: nota 2025 por S14
INSERT INTO prestamos_nota
  (comprobante_id, numero_nota_solicitud, funcionario_id, institucion_solicitante, funcionario_responsable,
   referencia, destinatario, fecha_prestamo, fecha_devolucion_estimada, fecha_devolucion_real,
   estado_prestamo, condicion_devolucion, observaciones)
SELECT (SELECT id FROM comprobantes_c31 WHERE observaciones = 'SEED:S14'),
       'NOTA-AUD-010/2025', f.id, 'Auditoría Interna', f.nombres || ' ' || f.apellidos,
       'REMISIÓN DE COMPROBANTES C31 EN CALIDAD DE PRÉSTAMO (RESPUESTA A SU NOTA NOTA-AUD-010/2025)',
       f.nombres || ' ' || f.apellidos, DATE '2025-11-03', DATE '2025-11-28', DATE '2025-11-25',
       'DEVUELTO', 'CONFORME', 'Auditoría gestión 2025'
FROM funcionarios f WHERE f.ci = '5678901';

-- ───────────────────────── Comprobantes UNIDOS (grupo) ─────────────────────────
-- Cada uno nace con un solo PREV o DEV; luego se agrupan.
-- Grupo 1: PREV 3 + PREV 7. Grupo 2: PREV 8 + DEV 12 (la numeración de PREV y DEV es independiente).
INSERT INTO comprobantes_c31
  (gestion, tipo_c31, monto_total, fecha_elaboracion, descripcion, numero_folio, estado_fisico, ubicacion_fisica, observaciones)
VALUES
  (2026, 'CON_IMPUTACION', 8800.00, DATE '2026-02-10', 'MATERIAL DE ESCRITORIO', NULL, 'EN_REVISION', NULL, 'SEED:U1'),
  (2026, 'CON_IMPUTACION', 7000.00, DATE '2026-02-10', 'MATERIAL DE LIMPIEZA', NULL, 'EN_REVISION', NULL, 'SEED:U2'),
  (2026, 'CON_IMPUTACION', 9200.50, DATE '2026-02-18', 'MANTENIMIENTO (PREVENTIVO)', NULL, 'EN_REVISION', NULL, 'SEED:U3'),
  (2026, 'SIN_IMPUTACION', 9200.50, DATE '2026-02-18', 'MANTENIMIENTO (DEVENGADO)', NULL, 'EN_REVISION', NULL, 'SEED:U4');

INSERT INTO c31_preventivos (comprobante_id, numero_preventivo)
SELECT id, CASE observaciones WHEN 'SEED:U1' THEN '3' WHEN 'SEED:U2' THEN '7' ELSE '8' END
FROM comprobantes_c31 WHERE observaciones IN ('SEED:U1','SEED:U2','SEED:U3');

INSERT INTO c31_devengados (comprobante_id, numero_devengado)
SELECT id, '12' FROM comprobantes_c31 WHERE observaciones = 'SEED:U4';

INSERT INTO c31_beneficiarios (comprobante_id, nombre_beneficiario)
SELECT id, CASE WHEN observaciones IN ('SEED:U1','SEED:U2') THEN 'PROVEEDORA COMERCIAL ANDINA S.R.L.' ELSE 'SERVICIOS TÉCNICOS BOLIVIA LTDA.' END
FROM comprobantes_c31 WHERE observaciones IN ('SEED:U1','SEED:U2','SEED:U3','SEED:U4');

UPDATE comprobantes_c31 SET grupo_union_id = '00000000-0000-4000-8000-0000000000a1' WHERE observaciones IN ('SEED:U1','SEED:U2');
UPDATE comprobantes_c31 SET grupo_union_id = '00000000-0000-4000-8000-0000000000a2' WHERE observaciones IN ('SEED:U3','SEED:U4');

COMMIT;

-- ───────────────────────── Verificación rápida ─────────────────────────
-- SELECT gestion, count(*) FROM comprobantes_c31 WHERE observaciones LIKE 'SEED:%' GROUP BY gestion;
-- Búsqueda por glosa dentro de una gestión (misma consulta que hace la API):
-- SELECT c.id, c.gestion, c.descripcion FROM comprobantes_c31 c
--  WHERE c.gestion = 2026 AND c.descripcion ILIKE '%combustible%';

-- ───────────────────────── LIMPIEZA (descomentar para borrar los datos de prueba) ─────────────────────────
-- BEGIN;
-- DELETE FROM prestamos_nota     WHERE numero_nota_solicitud IN ('NOTA-AUD-045/2026','NOTA-OBR-012/2026','NOTA-AUD-010/2025');
-- DELETE FROM prestamos_cuaderno WHERE comprobante_id IN (SELECT id FROM comprobantes_c31 WHERE observaciones LIKE 'SEED:%');
-- DELETE FROM c31_carpetas_ubicacion WHERE comprobante_id IN (SELECT id FROM comprobantes_c31 WHERE observaciones LIKE 'SEED:%');
-- DELETE FROM comprobantes_c31   WHERE observaciones LIKE 'SEED:%';   -- preventivos/devengados/beneficiarios caen en cascada
-- DELETE FROM carpetas   WHERE codigo_carpeta LIKE 'CARP-202%';
-- DELETE FROM estantes   WHERE codigo IN ('EST-A1','EST-A2','EST-B1');
-- DELETE FROM depositos  WHERE codigo IN ('DEP-01','DEP-02');
-- DELETE FROM funcionarios WHERE ci IN ('4567890','5678901','6789012','7890123','8901234','9012345','3456789','2345678');
-- COMMIT;
