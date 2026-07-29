export interface NotaEntrega {
  id: string
  numeroNota: string
  oficinaOrigen: string
  fechaEntrega: string // ISO date
  createdBy: string
  createdAt?: string
}

export type NotaEntregaCreatePayload = Omit<NotaEntrega, 'id' | 'createdBy' | 'createdAt'>

export type NotaEntregaUpdatePayload = Partial<NotaEntregaCreatePayload>
