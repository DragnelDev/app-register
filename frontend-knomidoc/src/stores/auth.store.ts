import { defineStore } from 'pinia'
import { authService } from '@/services/auth.service'
import type { LoginPayload, PerfilUpdatePayload, Usuario } from '@/types/auth.types'

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
    /** Tiene sesión pero aún no confirmó su correo con el código */
    emailPendiente: (state) => state.usuario?.emailVerificado === false,
    rol: (state) => state.usuario?.rol ?? null,
    isAdmin: (state) => state.usuario?.rol === 'ADMIN',
    /** Puede registrar actas de entrega y comprobantes C31 */
    puedeRegistrarC31: (state) =>
      state.usuario?.rol === 'ADMIN' || state.usuario?.rol === 'OPERADOR_ARCHIVOS',
    /** Puede crear y editar depósitos, estantes y carpetas del archivo físico */
    puedeGestionarArchivo: (state) =>
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

    /** Actualiza los datos propios y deja la sesión con el usuario ya corregido. */
    async actualizarPerfil(payload: PerfilUpdatePayload) {
      const usuario = await authService.actualizarPerfil(payload)
      this.usuario = { ...this.usuario, ...usuario }
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(this.usuario))
      return this.usuario
    },

    enviarCodigoVerificacion() {
      return authService.enviarCodigoVerificacion()
    },

    async verificarEmail(codigo: string) {
      const usuario = await authService.verificarEmail(codigo)
      this.usuario = { ...this.usuario, ...usuario }
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(this.usuario))
    },

    /** El servidor avisó que el correo no está verificado (p. ej. cambió desde otra sesión). */
    marcarEmailPendiente() {
      if (!this.usuario) return
      this.usuario = { ...this.usuario, emailVerificado: false }
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(this.usuario))
    },

    async forgotPassword(email: string) {
      this.loading = true
      try {
        return await authService.forgotPassword({ email })
      } finally {
        this.loading = false
      }
    },

    async resetPassword(email: string, codigo: string, password: string) {
      this.loading = true
      try {
        return await authService.resetPassword({ email, codigo, password })
      } finally {
        this.loading = false
      }
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
