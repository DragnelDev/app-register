/**
 * Store de autenticación y permisos (Pinia).
 *
 * - Matriz de permisos por perfil (los getters que gobiernan la UI).
 * - Ciclo de sesión: login, cambio de perfil, logout, persistencia.
 * - Cambio de perfil: los permisos se recalculan al instante.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '@/services/auth.service'
import { usuarioCon } from '@/test/fixtures'
import type { RolUsuario } from '@/types/common.types'

vi.mock('@/services/auth.service', () => ({
  authService: {
    login: vi.fn(),
    cambiarPerfil: vi.fn(),
    me: vi.fn(),
    actualizarPerfil: vi.fn(),
    verificarEmail: vi.fn(),
    enviarCodigoVerificacion: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}))

const TOKEN_KEY = 'knomidoc_access_token'
const USER_KEY = 'knomidoc_user'

type Permisos = {
  puedeImportar: boolean
  puedeRegistrarC31: boolean
  puedeTrabajarC31: boolean
  puedeExportar: boolean
  puedeRecibirActas: boolean
  puedeAnularActas: boolean
  puedeGestionarArchivo: boolean
  puedePrestar: boolean
  esSoloConsulta: boolean
  esSoloUbicacion: boolean
  esRemitente: boolean
  isAdmin: boolean
}

/** Matriz esperada, escrita a mano a partir de las reglas de negocio de cada perfil. */
const MATRIZ: Record<RolUsuario, Permisos> = {
  ADMIN: {
    puedeImportar: true,
    puedeRegistrarC31: true,
    puedeTrabajarC31: true,
    puedeExportar: true,
    puedeRecibirActas: true,
    puedeAnularActas: true,
    puedeGestionarArchivo: true,
    puedePrestar: true,
    esSoloConsulta: false,
    esSoloUbicacion: false,
    esRemitente: false,
    isAdmin: true,
  },
  OPERADOR_ARCHIVOS: {
    puedeImportar: true,
    puedeRegistrarC31: true,
    puedeTrabajarC31: true,
    puedeExportar: true,
    puedeRecibirActas: true,
    puedeAnularActas: true,
    puedeGestionarArchivo: true,
    puedePrestar: false,
    esSoloConsulta: false,
    esSoloUbicacion: false,
    esRemitente: false,
    isAdmin: false,
  },
  AUXILIAR_ARCHIVOS: {
    puedeImportar: false,
    puedeRegistrarC31: true,
    puedeTrabajarC31: true,
    puedeExportar: false,
    puedeRecibirActas: false,
    puedeAnularActas: false,
    puedeGestionarArchivo: true,
    puedePrestar: false,
    esSoloConsulta: false,
    esSoloUbicacion: false,
    esRemitente: false,
    isAdmin: false,
  },
  ENCARGADO_PRESTAMOS: {
    puedeImportar: false,
    puedeRegistrarC31: false,
    puedeTrabajarC31: false,
    puedeExportar: true,
    puedeRecibirActas: false,
    puedeAnularActas: false,
    puedeGestionarArchivo: false,
    puedePrestar: true,
    esSoloConsulta: false,
    esSoloUbicacion: false,
    esRemitente: false,
    isAdmin: false,
  },
  REMITENTE_C31: {
    puedeImportar: false,
    puedeRegistrarC31: false,
    puedeTrabajarC31: true,
    puedeExportar: false,
    puedeRecibirActas: false,
    puedeAnularActas: true,
    puedeGestionarArchivo: false,
    puedePrestar: false,
    esSoloConsulta: false,
    esSoloUbicacion: false,
    esRemitente: true,
    isAdmin: false,
  },
  CONSULTA_AVANZADA: {
    puedeImportar: false,
    puedeRegistrarC31: false,
    puedeTrabajarC31: false,
    puedeExportar: true,
    puedeRecibirActas: false,
    puedeAnularActas: false,
    puedeGestionarArchivo: false,
    puedePrestar: false,
    esSoloConsulta: true,
    esSoloUbicacion: false,
    esRemitente: false,
    isAdmin: false,
  },
  SOLO_LECTURA: {
    puedeImportar: false,
    puedeRegistrarC31: false,
    puedeTrabajarC31: false,
    puedeExportar: false,
    puedeRecibirActas: false,
    puedeAnularActas: false,
    puedeGestionarArchivo: false,
    puedePrestar: false,
    esSoloConsulta: true,
    esSoloUbicacion: true,
    esRemitente: false,
    isAdmin: false,
  },
  CONSULTA_EXTERNA: {
    puedeImportar: false,
    puedeRegistrarC31: false,
    puedeTrabajarC31: false,
    puedeExportar: false,
    puedeRecibirActas: false,
    puedeAnularActas: false,
    puedeGestionarArchivo: false,
    puedePrestar: false,
    esSoloConsulta: true,
    esSoloUbicacion: true,
    esRemitente: false,
    isAdmin: false,
  },
}

const leerPermisos = (auth: ReturnType<typeof useAuthStore>): Permisos => ({
  puedeImportar: auth.puedeImportar,
  puedeRegistrarC31: auth.puedeRegistrarC31,
  puedeTrabajarC31: auth.puedeTrabajarC31,
  puedeExportar: auth.puedeExportar,
  puedeRecibirActas: auth.puedeRecibirActas,
  puedeAnularActas: auth.puedeAnularActas,
  puedeGestionarArchivo: auth.puedeGestionarArchivo,
  puedePrestar: auth.puedePrestar,
  esSoloConsulta: auth.esSoloConsulta,
  esSoloUbicacion: auth.esSoloUbicacion,
  esRemitente: auth.esRemitente,
  isAdmin: auth.isAdmin,
})

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  setActivePinia(createPinia())
})

describe('auth.store · permisos por perfil', () => {
  it.each(Object.keys(MATRIZ) as RolUsuario[])(
    '%s tiene exactamente los permisos esperados',
    (rol) => {
      const auth = useAuthStore()
      auth.usuario = usuarioCon(rol)

      expect(leerPermisos(auth)).toEqual(MATRIZ[rol])
    },
  )

  it('sin sesión ningún permiso está concedido', () => {
    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(false)
    expect(Object.values(leerPermisos(auth)).every((v) => v === false)).toBe(true)
  })

  it('los perfiles de solo consulta NUNCA pueden registrar, trabajar, importar ni prestar', () => {
    const auth = useAuthStore()
    for (const rol of ['CONSULTA_AVANZADA', 'SOLO_LECTURA', 'CONSULTA_EXTERNA'] as RolUsuario[]) {
      auth.usuario = usuarioCon(rol)
      expect(auth.esSoloConsulta).toBe(true)
      expect(auth.puedeImportar).toBe(false)
      expect(auth.puedeRegistrarC31).toBe(false)
      expect(auth.puedeTrabajarC31).toBe(false)
      expect(auth.puedeGestionarArchivo).toBe(false)
      expect(auth.puedePrestar).toBe(false)
      expect(auth.puedeRecibirActas).toBe(false)
    }
  })

  it('CONSULTA_EXTERNA se comporta igual que SOLO_LECTURA (compatibilidad)', () => {
    expect(MATRIZ.CONSULTA_EXTERNA).toEqual(MATRIZ.SOLO_LECTURA)
  })

  it.each([
    ['REMITENTE_C31', '/actas-entrega'],
    ['SOLO_LECTURA', '/c31/con-imputacion'],
    ['CONSULTA_EXTERNA', '/c31/con-imputacion'],
    ['ADMIN', '/'],
    ['CONSULTA_AVANZADA', '/'],
  ] as const)('ruta inicial de %s → %s', (rol, ruta) => {
    const auth = useAuthStore()
    auth.usuario = usuarioCon(rol)
    expect(auth.rutaInicial).toBe(ruta)
  })

  it('perfiles: usa los asignados, o solo el activo si no hay lista', () => {
    const auth = useAuthStore()
    auth.usuario = usuarioCon('ADMIN', ['ADMIN', 'SOLO_LECTURA'])
    expect(auth.perfiles).toEqual(['ADMIN', 'SOLO_LECTURA'])

    auth.usuario = { ...usuarioCon('ADMIN'), roles: undefined }
    expect(auth.perfiles).toEqual(['ADMIN'])
  })
})

describe('auth.store · cambio de perfil dinámico', () => {
  it('actualiza token, rol activo y perfiles, y recalcula los permisos al instante', async () => {
    const auth = useAuthStore()
    auth.usuario = usuarioCon('ADMIN', ['ADMIN', 'SOLO_LECTURA'])
    auth.accessToken = 'token-admin'
    expect(auth.puedeImportar).toBe(true)
    expect(auth.isAdmin).toBe(true)

    vi.mocked(authService.cambiarPerfil).mockResolvedValue({
      accessToken: 'token-lectura',
      rol: 'SOLO_LECTURA',
      roles: ['ADMIN', 'SOLO_LECTURA'],
    })
    await auth.cambiarPerfil('SOLO_LECTURA')

    expect(authService.cambiarPerfil).toHaveBeenCalledWith('SOLO_LECTURA')
    expect(auth.accessToken).toBe('token-lectura')
    expect(auth.rol).toBe('SOLO_LECTURA')
    expect(leerPermisos(auth)).toEqual(MATRIZ.SOLO_LECTURA)
    // Se conservan los datos de la persona
    expect(auth.usuario?.nombreCompleto).toBe('Juan Pérez')
  })

  it('persiste el nuevo token y usuario (sobrevive a recargar la página)', async () => {
    const auth = useAuthStore()
    auth.usuario = usuarioCon('ADMIN', ['ADMIN', 'CONSULTA_AVANZADA'])
    vi.mocked(authService.cambiarPerfil).mockResolvedValue({
      accessToken: 'tk2',
      rol: 'CONSULTA_AVANZADA',
      roles: ['ADMIN', 'CONSULTA_AVANZADA'],
    })

    await auth.cambiarPerfil('CONSULTA_AVANZADA')

    expect(localStorage.getItem(TOKEN_KEY)).toBe('tk2')
    expect(JSON.parse(localStorage.getItem(USER_KEY) as string).rol).toBe('CONSULTA_AVANZADA')

    // Una "recarga": nueva instancia del store leyendo del almacenamiento
    setActivePinia(createPinia())
    const recargado = useAuthStore()
    expect(recargado.rol).toBe('CONSULTA_AVANZADA')
    expect(recargado.puedeImportar).toBe(false)
  })

  it('puede ir y volver entre perfiles sin perder permisos', async () => {
    const auth = useAuthStore()
    auth.usuario = usuarioCon('OPERADOR_ARCHIVOS', ['OPERADOR_ARCHIVOS', 'REMITENTE_C31'])

    vi.mocked(authService.cambiarPerfil).mockResolvedValueOnce({
      accessToken: 'a',
      rol: 'REMITENTE_C31',
      roles: ['OPERADOR_ARCHIVOS', 'REMITENTE_C31'],
    })
    await auth.cambiarPerfil('REMITENTE_C31')
    expect(leerPermisos(auth)).toEqual(MATRIZ.REMITENTE_C31)
    expect(auth.rutaInicial).toBe('/actas-entrega')

    vi.mocked(authService.cambiarPerfil).mockResolvedValueOnce({
      accessToken: 'b',
      rol: 'OPERADOR_ARCHIVOS',
      roles: ['OPERADOR_ARCHIVOS', 'REMITENTE_C31'],
    })
    await auth.cambiarPerfil('OPERADOR_ARCHIVOS')
    expect(leerPermisos(auth)).toEqual(MATRIZ.OPERADOR_ARCHIVOS)
  })

  it('elegir perfil resuelve "perfil pendiente" y lo borra de la sesión', async () => {
    const auth = useAuthStore()
    auth.usuario = usuarioCon('ADMIN', ['ADMIN', 'SOLO_LECTURA'])
    auth.perfilPendiente = true
    sessionStorage.setItem('knomidoc_perfil_pendiente', '1')
    vi.mocked(authService.cambiarPerfil).mockResolvedValue({
      accessToken: 't',
      rol: 'ADMIN',
      roles: ['ADMIN', 'SOLO_LECTURA'],
    })

    await auth.cambiarPerfil('ADMIN')

    expect(auth.perfilPendiente).toBe(false)
    expect(sessionStorage.getItem('knomidoc_perfil_pendiente')).toBeNull()
  })

  it('si el servidor rechaza el cambio, el perfil y los permisos NO cambian', async () => {
    const auth = useAuthStore()
    auth.usuario = usuarioCon('ADMIN', ['ADMIN'])
    auth.accessToken = 'token-original'
    vi.mocked(authService.cambiarPerfil).mockRejectedValue(new Error('403'))

    await expect(auth.cambiarPerfil('SOLO_LECTURA')).rejects.toThrow('403')

    expect(auth.rol).toBe('ADMIN')
    expect(auth.accessToken).toBe('token-original')
    expect(auth.puedeImportar).toBe(true)
  })

  it('el perfil predeterminado solo se actualiza si el usuario ya tenía uno guardado', async () => {
    const auth = useAuthStore()
    auth.usuario = usuarioCon('ADMIN', ['ADMIN', 'SOLO_LECTURA'])
    vi.mocked(authService.cambiarPerfil).mockResolvedValue({
      accessToken: 't',
      rol: 'SOLO_LECTURA',
      roles: ['ADMIN', 'SOLO_LECTURA'],
    })

    await auth.cambiarPerfil('SOLO_LECTURA')
    expect(auth.perfilPredeterminado()).toBeNull()

    auth.guardarPerfilPredeterminado('ADMIN')
    await auth.cambiarPerfil('SOLO_LECTURA')
    expect(auth.perfilPredeterminado()).toBe('SOLO_LECTURA')
  })
})

describe('auth.store · sesión', () => {
  it('login guarda token y usuario, y marca si debe elegir perfil', async () => {
    const auth = useAuthStore()
    vi.mocked(authService.login).mockResolvedValue({
      accessToken: 'jwt-123',
      usuario: usuarioCon('ADMIN', ['ADMIN', 'SOLO_LECTURA']),
      requierePerfil: true,
    })

    await auth.login({ username: 'jperez', password: 'x' })

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.perfilPendiente).toBe(true)
    expect(localStorage.getItem(TOKEN_KEY)).toBe('jwt-123')
    expect(sessionStorage.getItem('knomidoc_perfil_pendiente')).toBe('1')
    expect(auth.loading).toBe(false)
  })

  it('login con respuesta incompleta falla y no deja sesión a medias', async () => {
    const auth = useAuthStore()
    vi.mocked(authService.login).mockResolvedValue({ accessToken: '', usuario: undefined } as never)

    await expect(auth.login({ username: 'a', password: 'b' })).rejects.toThrow(/inválida/)

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.usuario).toBeNull()
    expect(auth.loading).toBe(false)
  })

  it('login fallido (credenciales) deja loading en false', async () => {
    const auth = useAuthStore()
    vi.mocked(authService.login).mockRejectedValue(new Error('401'))
    await expect(auth.login({ username: 'a', password: 'b' })).rejects.toThrow()
    expect(auth.loading).toBe(false)
    expect(auth.isAuthenticated).toBe(false)
  })

  it('logout limpia estado y almacenamiento; todos los permisos vuelven a false', async () => {
    const auth = useAuthStore()
    vi.mocked(authService.login).mockResolvedValue({
      accessToken: 'jwt',
      usuario: usuarioCon('ADMIN'),
    })
    await auth.login({ username: 'a', password: 'b' })
    expect(auth.puedeImportar).toBe(true)

    auth.logout()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.usuario).toBeNull()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(USER_KEY)).toBeNull()
    expect(Object.values(leerPermisos(auth)).every((v) => v === false)).toBe(true)
  })

  it('un JSON corrupto en el almacenamiento no rompe el arranque', () => {
    localStorage.setItem(USER_KEY, '{no es json')
    const auth = useAuthStore()
    expect(auth.usuario).toBeNull()
  })

  it('marcarEmailPendiente bloquea el uso hasta verificar el correo', () => {
    const auth = useAuthStore()
    auth.usuario = usuarioCon('ADMIN')
    expect(auth.emailPendiente).toBe(false)

    auth.marcarEmailPendiente()

    expect(auth.emailPendiente).toBe(true)
    expect(JSON.parse(localStorage.getItem(USER_KEY) as string).emailVerificado).toBe(false)
  })
})
