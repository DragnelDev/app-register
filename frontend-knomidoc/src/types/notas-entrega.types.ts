import type { ComprobanteC31 } from './c31.types'

export interface NotaEntrega {
  id: string
  numeroNota: string
  oficinaOrigen: string
  fechaEntrega: string // ISO date
  createdBy: string
  createdAt?: string
  /** Comprobantes C31 vinculados a esta acta (solo viene poblado al pedir el detalle por id) */
  comprobantesC31?: ComprobanteC31[]
}

export type NotaEntregaCreatePayload = Omit<NotaEntrega, 'id' | 'createdBy' | 'createdAt'>

export type NotaEntregaUpdatePayload = Partial<NotaEntregaCreatePayload>
