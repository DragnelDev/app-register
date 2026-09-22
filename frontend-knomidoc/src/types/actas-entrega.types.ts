import type { ComprobanteC31 } from './c31.types'

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
  /** Comprobantes C31 vinculados a esta acta (solo viene poblado al pedir el detalle por id) */
  comprobantesC31?: ComprobanteC31[]
}

export type ActaEntregaCreatePayload = Omit<
  ActaEntrega,
  'id' | 'cantidadComprobantes' | 'comprobantesC31'
>

export type ActaEntregaUpdatePayload = Partial<ActaEntregaCreatePayload>
