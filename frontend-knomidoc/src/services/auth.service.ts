import apiClient from './api.client'
import type {
  ForgotPasswordPayload,
  LoginPayload,
  LoginResponse,
  MensajeResponse,
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
}
