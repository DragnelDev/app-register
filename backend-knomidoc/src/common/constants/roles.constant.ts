/**
 * Perfiles (roles) del sistema. Un usuario puede tener varios y trabaja con
 * uno activo a la vez, como en el SIGEP.
 *  - ADMIN: gestiona usuarios y perfiles; acceso total.
 *  - OPERADOR_ARCHIVOS: registra comprobantes C31, actas, ubicación y archivo físico;
 *    recibe las actas de entrega.
 *  - AUXILIAR_ARCHIVOS: apoya al archivista: registra comprobantes, arma actas, ubica y rotula el
 *    archivo físico. No aprueba (recibe) ni anula actas.
 *  - ENCARGADO_PRESTAMOS: registra préstamos (nota formal y cuaderno), devoluciones y funcionarios.
 *  - REMITENTE_C31: área que remite C31 al archivo: arma el acta de entrega y la imprime;
 *    solo ve sus actas. El archivista la recibe.
 *  - CONSULTA_AVANZADA: solo lectura con búsquedas/filtros completos, reportes y exportación
 *    (PDF/Excel), seguimiento e historial. No modifica nada.
 *  - SOLO_LECTURA: consulta básica de comprobantes, actas, ubicación y préstamos. Sin exportar,
 *    sin reportes ni auditoría. No modifica nada.
 *  - CONSULTA_EXTERNA: rol anterior; equivale a SOLO_LECTURA (se conserva por compatibilidad).
 */
export const ROLES_USUARIO = [
  'ADMIN',
  'OPERADOR_ARCHIVOS',
  'AUXILIAR_ARCHIVOS',
  'ENCARGADO_PRESTAMOS',
  'REMITENTE_C31',
  'CONSULTA_AVANZADA',
  'SOLO_LECTURA',
  'CONSULTA_EXTERNA',
] as const;

export type RolUsuario = (typeof ROLES_USUARIO)[number];

/** Perfiles que pueden consultar pero nunca modificar. */
export const ROLES_SOLO_CONSULTA: readonly RolUsuario[] = [
  'CONSULTA_AVANZADA',
  'SOLO_LECTURA',
  'CONSULTA_EXTERNA',
];

/** Perfiles que pueden generar reportes y exportar (PDF/Excel). */
export const ROLES_REPORTES: readonly RolUsuario[] = [
  'ADMIN',
  'OPERADOR_ARCHIVOS',
  'ENCARGADO_PRESTAMOS',
  'CONSULTA_AVANZADA',
];
