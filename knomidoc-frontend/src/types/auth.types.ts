import type { RolUsuario } from './common.types'

export interface Usuario {
  id: string
  nombreCompleto: string
  email: string
  rol: RolUsuario
  estado: boolean
}

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken?: string
  access_token?: string
  usuario: Usuario
}

export interface UsuarioCreatePayload {
  nombreCompleto: string
  email: string
  passwordHash: string
  rol: RolUsuario
}

export type UsuarioUpdatePayload = Partial<Omit<UsuarioCreatePayload, 'password'>> & {
  passwordHash?: string // solo si se quiere resetear
  estado?: boolean
}
