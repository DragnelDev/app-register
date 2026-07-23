import apiClient from './api.client'
import type { LoginPayload, LoginResponse, Usuario } from '@/types/auth.types'

export const authService = {
  login(payload: LoginPayload) {
    return apiClient.post<LoginResponse>('/auth/login', payload).then((r) => r.data)
  },

  me() {
    return apiClient.get<Usuario>('/auth/me').then((r) => r.data)
  },
}
