import type { RolUsuario } from './common.types'

export interface Usuario {
  id: string
  username: string
  nombreCompleto: string
  email: string
  cargo?: string | null
  unidadOArea?: string | null
  telefono?: string | null
  /** Foto de perfil: URL o data URL */
  foto?: string | null
  /** Perfil con el que trabaja en esta sesión */
  rol: RolUsuario
  /** Perfiles que puede asumir (el activo es `rol`) */
  roles?: RolUsuario[]
  /** Perfiles asignados (listado de usuarios) */
  rolesDisponibles?: RolUsuario[]
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
  /** Tiene más de un perfil: debe elegir con cuál trabajar */
  requierePerfil?: boolean
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
  /** Perfil por defecto (el primero de `roles`) */
  rol?: RolUsuario
  /** Perfiles del usuario; puede tener varios */
  roles?: RolUsuario[]
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
  /** URL o data URL; "" la quita */
  foto?: string
}

export interface CambiarPasswordPayload {
  passwordActual: string
  passwordNueva: string
}
