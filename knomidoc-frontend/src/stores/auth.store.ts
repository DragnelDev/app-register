import { defineStore } from 'pinia'
import { authService } from '@/services/auth.service'
import type { LoginPayload, Usuario } from '@/types/auth.types'

const TOKEN_STORAGE_KEY = 'knomidoc_access_token'

interface AuthState {
  usuario: Usuario | null
  accessToken: string | null
  loading: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    usuario: null,
    accessToken: sessionStorage.getItem(TOKEN_STORAGE_KEY),
    loading: false,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken),
    rol: (state) => state.usuario?.rol ?? null,
    isAdmin: (state) => state.usuario?.rol === 'ADMIN',
    puedeRegistrar: (state) =>
      state.usuario?.rol === 'ADMIN' || state.usuario?.rol === 'REGISTRADOR',
  },

  actions: {
    async login(payload: LoginPayload) {
      this.loading = true
      try {
        const response = await authService.login(payload)
        const accessToken = response.accessToken ?? response.access_token
        const usuario = response.usuario

        if (!accessToken || !usuario) {
          throw new Error('Respuesta de login inválida')
        }

        this.accessToken = accessToken
        this.usuario = usuario
        sessionStorage.setItem(TOKEN_STORAGE_KEY, accessToken)
      } finally {
        this.loading = false
      }
    },

    async fetchProfile() {
      if (!this.accessToken) return
      this.usuario = await authService.me()
    },

    logout() {
      this.usuario = null
      this.accessToken = null
      sessionStorage.removeItem(TOKEN_STORAGE_KEY)
    },
  },
})
