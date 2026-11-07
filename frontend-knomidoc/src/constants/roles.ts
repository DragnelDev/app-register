import type { RolUsuario } from '@/types/common.types'

/** Nombre y alcance de cada perfil (rol). Un usuario puede tener varios y trabaja con uno a la vez. */
export const ROLES_INFO: Record<RolUsuario, { label: string; descripcion: string }> = {
  ADMIN: {
    label: 'Administrador',
    descripcion: 'Gestiona usuarios, perfiles, parámetros y tiene acceso total.',
  },
  OPERADOR_ARCHIVOS: {
    label: 'Operador de archivos',
    descripcion: 'Registra comprobantes C31, actas, ubicación física y recibe las remisiones.',
  },
  ENCARGADO_PRESTAMOS: {
    label: 'Encargado de préstamos',
    descripcion: 'Registra préstamos por cuaderno y nota, devoluciones y funcionarios.',
  },
  REMITENTE_C31: {
    label: 'Remitente de C31',
    descripcion: 'Remite C31 al archivo mediante una remisión y consulta el estado de sus envíos.',
  },
  CONSULTA_AVANZADA: {
    label: 'Consulta avanzada',
    descripcion: 'Solo lectura con filtros completos, reportes, exportación y seguimiento.',
  },
  SOLO_LECTURA: {
    label: 'Solo lectura',
    descripcion: 'Consulta básica de comprobantes, actas, ubicación y préstamos. No exporta ni modifica.',
  },
  CONSULTA_EXTERNA: {
    label: 'Consulta externa',
    descripcion: 'Rol anterior; equivale a Solo lectura.',
  },
}

/** Perfiles que se pueden asignar (CONSULTA_EXTERNA queda solo por compatibilidad). */
export const ROLES_ASIGNABLES: RolUsuario[] = [
  'ADMIN',
  'OPERADOR_ARCHIVOS',
  'ENCARGADO_PRESTAMOS',
  'REMITENTE_C31',
  'CONSULTA_AVANZADA',
  'SOLO_LECTURA',
]

export const rolLabel = (rol?: string | null) =>
  (rol && ROLES_INFO[rol as RolUsuario]?.label) || rol || ''
