import type { ComprobanteC31 } from './c31.types'

export type EstadoActa = 'BORRADOR' | 'RECIBIDA' | 'ANULADA'

/** Acta de entrega de comprobantes desde Tesorería (lote de ingreso, relación "agrupa"). */
export interface ActaEntrega {
  id: string
  numeroActa: string
  unidadEmisora: string
  responsableEntrega: string
  responsableRecepcion: string
  cantidadComprobantes: number
  fechaRecepcion: string // ISO date
  observaciones?: string | null
  estado: EstadoActa
  fechaAprobacion?: string | null
  aprobadoPor?: { id: number; nombreCompleto: string } | null
  /** Comprobantes C31 vinculados a esta acta (solo viene poblado al pedir el detalle por id) */
  comprobantesC31?: ComprobanteC31[]
}

export interface ActaEntregaCreatePayload {
  numeroActa: string
  unidadEmisora?: string
  responsableEntrega: string
  responsableRecepcion: string
  fechaRecepcion: string
  observaciones?: string
  /** Comprobantes ya registrados (En revisión) que se entregan en el acta */
  comprobanteIds?: number[]
}

export type ActaEntregaUpdatePayload = Partial<ActaEntregaCreatePayload>

/** Revisión del archivista al recibir el acta. */
export interface ActaAprobarPayload {
  recibidos: number[]
  observados?: { comprobanteId: number; motivo: string }[]
  fechaRecepcion?: string
  observaciones?: string
}
