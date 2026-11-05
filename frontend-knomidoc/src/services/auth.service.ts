import apiClient from './api.client'
import type {
  CambiarPasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  LoginResponse,
  MensajeResponse,
  Perfil,
  PerfilUpdatePayload,
  ResetPasswordPayload,
  Usuario,
} from '@/types/auth.types'

export const authService = {
  login(payload: LoginPayload) {
    return apiClient.post<LoginResponse>('/auth/login', payload).then((r) => r.data)
  },

  me() {
    return apiClient.get<Usuario>('/auth/me').then((r) => r.data)
  },

  forgotPassword(payload: ForgotPasswordPayload) {
    return apiClient.post<MensajeResponse>('/auth/forgot-password', payload).then((r) => r.data)
  },

  resetPassword(payload: ResetPasswordPayload) {
    return apiClient.post<MensajeResponse>('/auth/reset-password', payload).then((r) => r.data)
  },

  // --- Perfil del usuario autenticado ---
  perfil() {
    return apiClient.get<Perfil>('/perfil').then((r) => r.data)
  },

  actualizarPerfil(payload: PerfilUpdatePayload) {
    return apiClient.patch<Usuario>('/perfil', payload).then((r) => r.data)
  },

  cambiarPassword(payload: CambiarPasswordPayload) {
    return apiClient.patch<MensajeResponse>('/perfil/password', payload).then((r) => r.data)
  },

  // --- Verificación del correo con código de 6 dígitos ---
  enviarCodigoVerificacion() {
    return apiClient.post<MensajeResponse>('/auth/verificar-email/enviar').then((r) => r.data)
  },

  verificarEmail(codigo: string) {
    return apiClient
      .post<{ usuario: Usuario }>('/auth/verificar-email', { codigo })
      .then((r) => r.data.usuario)
  },
}
