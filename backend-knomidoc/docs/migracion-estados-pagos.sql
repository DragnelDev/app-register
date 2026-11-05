-- Migración para una base de datos YA EXISTENTE (synchronize crea las tablas/columnas
-- nuevas al iniciar; este script solo traslada los datos). Ejecutar UNA vez, después de
-- levantar el backend nuevo, con respaldo previo.
BEGIN;

-- 1) Actas que ya existían: se consideran recibidas (sus comprobantes ya estaban en archivo)
UPDATE actas_entrega SET estado = 'RECIBIDA' WHERE estado = 'BORRADOR';

-- 2) Comprobantes que estaban "En archivo" con folio y ubicación definitiva -> Archivado correctamente
UPDATE comprobantes_c31
   SET estado_fisico = 'ARCHIVADO'
 WHERE estado_fisico = 'EN_ARCHIVO'
   AND COALESCE(TRIM(numero_folio), '') <> ''
   AND COALESCE(TRIM(ubicacion_fisica), '') NOT IN ('', 'ARCHIVOS GAMSL');

-- 3) Los "En trámite" antiguos ya recibidos por un acta quedan En archivo; el resto sigue En trámite
UPDATE comprobantes_c31 SET estado_fisico = 'EN_ARCHIVO'
 WHERE estado_fisico = 'EN_TRAMITE' AND acta_entrega_id IS NOT NULL;

-- 4) Cheques -> pagos: solo cuando el comprobante tiene UN beneficiario (si hay varios no se
--    sabe a quién corresponde cada cheque; esos quedan en c31_cheques para revisión manual).
--    Con un único cheque el monto es el total del comprobante; con varios queda en NULL.
INSERT INTO c31_pagos (comprobante_id, beneficiario_id, tipo_pago, numero_documento, monto, estado_pago)
SELECT ch.comprobante_id,
       b.id,
       'CHEQUE',
       ch.numero_cheque,
       CASE WHEN (SELECT COUNT(*) FROM c31_cheques x WHERE x.comprobante_id = ch.comprobante_id) = 1
            THEN c.monto_total END,
       'PAGADO'
  FROM c31_cheques ch
  JOIN comprobantes_c31 c ON c.id = ch.comprobante_id
  JOIN c31_beneficiarios b ON b.comprobante_id = ch.comprobante_id
 WHERE (SELECT COUNT(*) FROM c31_beneficiarios y WHERE y.comprobante_id = ch.comprobante_id) = 1;

-- Revisar antes de borrar: cheques que NO se migraron
-- SELECT * FROM c31_cheques ch WHERE NOT EXISTS (
--   SELECT 1 FROM c31_pagos p WHERE p.comprobante_id = ch.comprobante_id AND p.numero_documento = ch.numero_cheque);

-- 5) Verificación de correo: los usuarios que ya existían se marcan como verificados para no
--    dejarlos fuera si aún no hay SMTP. Si prefiere que TODOS confirmen su correo con el código,
--    omita este UPDATE (al iniciar sesión se les pedirá verificarlo).
UPDATE usuarios SET email_verificado = TRUE, email_verificado_en = NOW() WHERE email_verificado IS NOT TRUE;

COMMIT;
-- Cuando todo esté verificado:  DROP TABLE c31_cheques;
