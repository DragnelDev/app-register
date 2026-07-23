export interface NotaEntrega {
  id: string
  numeroNota: string
  oficinaOrigen: string
  fechaEntrega: string // ISO date
  imagenUrl?: string | null
  createdBy: string
  createdAt?: string
}

export type NotaEntregaCreatePayload = Omit<NotaEntrega, 'id' | 'createdBy' | 'createdAt'> & {
  imagenFile?: File | null
}

export type NotaEntregaUpdatePayload = Partial<NotaEntregaCreatePayload>
