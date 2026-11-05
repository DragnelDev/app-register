import type { RolUsuario } from './common.types'

export interface Usuario {
  id: string
  username: string
  nombreCompleto: string
  email: string
  cargo?: string | null
  unidadOArea?: string | null
  telefono?: string | null
  rol: RolUsuario
  activo: boolean
  /** El correo se confirmó con el código enviado */
  emailVerificado?: boolean
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

export interface ForgotPasswordPayload {
  email: string
}

export interface ResetPasswordPayload {
  email: string
  codigo: string
  password: string
}

export interface MensajeResponse {
  mensaje: string
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

export interface PerfilActividad {
  comprobantesRegistrados: number
  cambiosDeEstado: number
  recientes: {
    comprobanteId: number
    fecha: string
    estadoNuevo: string
    origen: string
    referencia: string | null
  }[]
}

export interface Perfil extends Usuario {
  fechaCreacion?: string
  actividad: PerfilActividad
}

export interface PerfilUpdatePayload {
  nombreCompleto?: string
  email?: string
  cargo?: string
  unidadOArea?: string
  telefono?: string
}

export interface CambiarPasswordPayload {
  passwordActual: string
  passwordNueva: string
}
