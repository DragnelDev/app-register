/**
 * Roles del sistema según el DER (USUARIOS.rol).
 *  - ADMIN: gestiona usuarios y tiene acceso total.
 *  - OPERADOR_ARCHIVOS: registra actas de entrega y comprobantes C31.
 *  - ENCARGADO_PRESTAMOS: registra préstamos (nota formal y cuaderno rápido).
 *  - CONSULTA_EXTERNA: solo lectura.
 */
export const ROLES_USUARIO = [
  'ADMIN',
  'OPERADOR_ARCHIVOS',
  'ENCARGADO_PRESTAMOS',
  'CONSULTA_EXTERNA',
] as const;

export type RolUsuario = (typeof ROLES_USUARIO)[number];
