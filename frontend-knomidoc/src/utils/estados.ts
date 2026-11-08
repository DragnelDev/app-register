import type { EstadoFisico } from '@/types/common.types'

/** Estados del C31 en el orden del recorrido del documento físico. */
export const ESTADOS_C31: { value: EstadoFisico; label: string; ayuda: string }[] = [
  {
    value: 'EN_TRAMITE',
    label: 'En trámite (incompleto)',
    ayuda: 'Registrado; faltan firmas, sellos o respaldos.',
  },
  {
    value: 'EN_REVISION',
    label: 'En revisión / firmado',
    ayuda: 'Firmado y completo; listo para remitir a Archivo.',
  },
  {
    value: 'EN_ARCHIVO',
    label: 'En archivo',
    ayuda: 'Ingresó a Archivo mediante acta de entrega.',
  },
  {
    value: 'ARCHIVADO',
    label: 'Archivado correctamente',
    ayuda: 'Verificado, foliado y ubicado en su lugar final.',
  },
  {
    value: 'PRESTADO',
    label: 'Prestado',
    ayuda: 'Retirado temporalmente para consulta o auditoría.',
  },
  { value: 'OBSERVADO', label: 'Observado', ayuda: 'Inconsistencias o devolución por fallas.' },
  { value: 'ANULADO', label: 'Revertido / anulado', ayuda: 'Dejado sin efecto en el SIGEP.' },
]

export const ESTADO_C31_LABEL: Record<string, string> = Object.fromEntries(
  ESTADOS_C31.map((e) => [e.value, e.label]),
)

/** Cambios que puede pedir el usuario (espejo del backend); el resto los hace el sistema. */
export const TRANSICIONES_MANUALES: Record<EstadoFisico, EstadoFisico[]> = {
  EN_TRAMITE: ['EN_REVISION', 'OBSERVADO', 'ANULADO'],
  EN_REVISION: ['EN_TRAMITE', 'OBSERVADO', 'ANULADO'],
  OBSERVADO: ['EN_TRAMITE', 'EN_REVISION', 'ANULADO'],
  EN_ARCHIVO: ['ARCHIVADO', 'OBSERVADO', 'ANULADO'],
  ARCHIVADO: ['OBSERVADO', 'ANULADO'],
  PRESTADO: [],
  ANULADO: [],
}

export const ESTADO_ACTA_LABEL: Record<string, string> = {
  BORRADOR: 'Borrador',
  RECIBIDA: 'Recibida',
  ANULADA: 'Anulada',
}

export const TIPO_PAGO_LABEL: Record<string, string> = {
  CHEQUE: 'Cheque',
  ELECTRONICO: 'Pago electrónico',
}

export const ESTADO_PAGO_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  PAGADO: 'Pagado',
  ANULADO: 'Anulado',
}

export const bs = (n: number | null | undefined) =>
  new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(n ?? 0),
  )

const dos = (n: number) => String(n).padStart(2, '0')

/** dd/mm/aaaa (día, mes y año; siempre en ese orden) */
export const fechaCorta = (v?: string | null) => {
  if (!v) return '—'
  if (v.length <= 10) {
    const [y, m, d] = v.split('-')
    return y && m && d ? `${d}/${m}/${y}` : '—'
  }
  const f = new Date(v)
  return Number.isNaN(f.getTime())
    ? '—'
    : `${dos(f.getDate())}/${dos(f.getMonth() + 1)}/${f.getFullYear()}`
}

/** dd/mm/aaaa hh:mm (24 h) */
export const fechaHora = (v?: string | null) => {
  if (!v) return '—'
  const f = new Date(v)
  return Number.isNaN(f.getTime())
    ? '—'
    : `${fechaCorta(v)} ${dos(f.getHours())}:${dos(f.getMinutes())}`
}
