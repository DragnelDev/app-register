import { defineStore } from 'pinia'
import { authService } from '@/services/auth.service'
import type { LoginPayload, Usuario } from '@/types/auth.types'

const TOKEN_STORAGE_KEY = 'knomidoc_access_token'
const USER_STORAGE_KEY = 'knomidoc_user'

const readStoredUser = (): Usuario | null => {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Usuario) : null
  } catch {
    return null
  }
}

interface AuthState {
  usuario: Usuario | null
  accessToken: string | null
  loading: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    usuario: readStoredUser(),
    accessToken:
      localStorage.getItem(TOKEN_STORAGE_KEY) ?? sessionStorage.getItem(TOKEN_STORAGE_KEY),
    loading: false,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken),
    rol: (state) => state.usuario?.rol ?? null,
    isAdmin: (state) => state.usuario?.rol === 'ADMIN',
    /** Puede registrar actas de entrega y comprobantes C31 */
    puedeRegistrarC31: (state) =>
      state.usuario?.rol === 'ADMIN' || state.usuario?.rol === 'OPERADOR_ARCHIVOS',
    /** Puede registrar y devolver préstamos (cuaderno y nota) */
    puedePrestar: (state) =>
      state.usuario?.rol === 'ADMIN' || state.usuario?.rol === 'ENCARGADO_PRESTAMOS',
  },

  actions: {
    async login(payload: LoginPayload) {
      this.loading = true
      try {
        const response = await authService.login(payload)
        const { accessToken, usuario } = response

        if (!accessToken || !usuario) {
          throw new Error('Respuesta de login inválida')
        }

        this.accessToken = accessToken
        this.usuario = usuario
        localStorage.setItem(TOKEN_STORAGE_KEY, accessToken)
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(usuario))
        sessionStorage.removeItem(TOKEN_STORAGE_KEY)
      } finally {
        this.loading = false
      }
    },

    async fetchProfile() {
      if (!this.accessToken) return
      const usuario = await authService.me()
      this.usuario = usuario
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(usuario))
    },

    logout() {
      this.usuario = null
      this.accessToken = null
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      localStorage.removeItem(USER_STORAGE_KEY)
      sessionStorage.removeItem(TOKEN_STORAGE_KEY)
    },
  },
})
