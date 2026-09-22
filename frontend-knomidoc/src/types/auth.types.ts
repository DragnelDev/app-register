import type { RolUsuario } from './common.types'

export interface Usuario {
  id: string
  username: string
  nombreCompleto: string
  email: string
  cargo?: string | null
  unidadOArea?: string | null
  rol: RolUsuario
  activo: boolean
}

/** Listado liviano usado por el selector de "solicitante" de un préstamo por cuaderno */
export interface UsuarioSolicitante {
  id: string
  nombreCompleto: string
  cargo?: string | null
  unidadOArea?: string | null
}

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  usuario: Usuario
}

export interface UsuarioCreatePayload {
  username: string
  nombreCompleto: string
  email: string
  cargo?: string
  unidadOArea?: string
  password?: string
  rol: RolUsuario
}

export type UsuarioUpdatePayload = Partial<Omit<UsuarioCreatePayload, 'password'>> & {
  password?: string // solo si se quiere resetear
  activo?: boolean
}
