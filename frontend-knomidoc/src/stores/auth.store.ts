import { defineStore } from 'pinia'
import { authService } from '@/services/auth.service'
import type { LoginPayload, PerfilUpdatePayload, Usuario } from '@/types/auth.types'

const TOKEN_STORAGE_KEY = 'knomidoc_access_token'
const USER_STORAGE_KEY = 'knomidoc_user'
const PERFIL_PENDIENTE_KEY = 'knomidoc_perfil_pendiente'

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
  /** Inició sesión con varios perfiles y aún no eligió con cuál trabajar */
  perfilPendiente: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    usuario: readStoredUser(),
    accessToken:
      localStorage.getItem(TOKEN_STORAGE_KEY) ?? sessionStorage.getItem(TOKEN_STORAGE_KEY),
    loading: false,
    perfilPendiente: sessionStorage.getItem(PERFIL_PENDIENTE_KEY) === '1',
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken),
    /** Tiene sesión pero aún no confirmó su correo con el código */
    emailPendiente: (state) => state.usuario?.emailVerificado === false,
    rol: (state) => state.usuario?.rol ?? null,
    isAdmin: (state) => state.usuario?.rol === 'ADMIN',
    /** Perfiles con los que puede trabajar (el activo es `rol`) */
    perfiles: (state) => state.usuario?.roles ?? (state.usuario ? [state.usuario.rol] : []),
    esRemitente: (state) => state.usuario?.rol === 'REMITENTE_C31',
    /** Perfil de solo consulta (no modifica nada) */
    esSoloConsulta: (state) =>
      ['SOLO_LECTURA', 'CONSULTA_AVANZADA', 'CONSULTA_EXTERNA'].includes(state.usuario?.rol ?? ''),
    /** Puede exportar (PDF/Excel) y ver reportes */
    puedeExportar: (state) =>
      ['ADMIN', 'OPERADOR_ARCHIVOS', 'ENCARGADO_PRESTAMOS', 'CONSULTA_AVANZADA'].includes(
        state.usuario?.rol ?? '',
      ),
    /** Archivista: recibe (aprueba) actas de entrega y las anula */
    puedeRecibirActas: (state) =>
      state.usuario?.rol === 'ADMIN' || state.usuario?.rol === 'OPERADOR_ARCHIVOS',
    puedeAnularActas: (state) =>
      ['ADMIN', 'OPERADOR_ARCHIVOS', 'REMITENTE_C31'].includes(state.usuario?.rol ?? ''),
    /** Ruta inicial según el perfil activo */
    rutaInicial: (state) => (state.usuario?.rol === 'REMITENTE_C31' ? '/actas-entrega' : '/'),
    /** Puede registrar comprobantes C31 y armar actas de entrega */
    puedeRegistrarC31: (state) =>
      ['ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS'].includes(state.usuario?.rol ?? ''),
    /** Puede crear comprobantes y trabajar con ellos (el remitente, solo hasta Firmado) */
    puedeTrabajarC31: (state) =>
      ['ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS', 'REMITENTE_C31'].includes(
        state.usuario?.rol ?? '',
      ),
    /** Puede crear y editar depósitos, estantes y carpetas del archivo físico */
    puedeGestionarArchivo: (state) =>
      ['ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS'].includes(state.usuario?.rol ?? ''),
    /** Puede registrar y devolver préstamos (cuaderno y nota) */
    puedePrestar: (state) =>
      state.usuario?.rol === 'ADMIN' || state.usuario?.rol === 'ENCARGADO_PRESTAMOS',
  },

  actions: {
    async login(payload: LoginPayload) {
      this.loading = true
      try {
        const response = await authService.login(payload)
        const { accessToken, usuario, requierePerfil } = response

        if (!accessToken || !usuario) {
          throw new Error('Respuesta de login inválida')
        }

        this.accessToken = accessToken
        this.usuario = usuario
        localStorage.setItem(TOKEN_STORAGE_KEY, accessToken)
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(usuario))
        sessionStorage.removeItem(TOKEN_STORAGE_KEY)
        this.perfilPendiente = Boolean(requierePerfil)
        if (requierePerfil) sessionStorage.setItem(PERFIL_PENDIENTE_KEY, '1')
        else sessionStorage.removeItem(PERFIL_PENDIENTE_KEY)
      } finally {
        this.loading = false
      }
    },

    /** Cambia de perfil sin cerrar sesión: el servidor emite un token con ese rol. */
    async cambiarPerfil(rol: string) {
      const r = await authService.cambiarPerfil(rol)
      this.accessToken = r.accessToken
      localStorage.setItem(TOKEN_STORAGE_KEY, r.accessToken)
      sessionStorage.removeItem(TOKEN_STORAGE_KEY)
      if (this.usuario) {
        this.usuario = {
          ...this.usuario,
          rol: r.rol as Usuario['rol'],
          roles: r.roles as Usuario['roles'],
        }
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(this.usuario))
      }
      this.perfilPendiente = false
      sessionStorage.removeItem(PERFIL_PENDIENTE_KEY)
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
      this.perfilPendiente = false
      sessionStorage.removeItem(PERFIL_PENDIENTE_KEY)
    },
  },
})
