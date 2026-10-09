export interface Deposito {
  id: number
  codigo: string
  nombre: string
  ubicacion?: string | null
  descripcion?: string | null
  activo: boolean
  totalEstantes?: number
}

export interface DepositoPayload {
  codigo: string
  nombre: string
  ubicacion?: string
  descripcion?: string
  activo?: boolean
}

export interface Estante {
  id: number
  codigo: string
  descripcion?: string | null
  niveles?: number | null
  depositoId: number
  deposito?: Deposito
  activo: boolean
  totalCarpetas?: number
}

export interface EstantePayload {
  codigo: string
  depositoId: number | null
  descripcion?: string
  niveles?: number | null
  activo?: boolean
}
