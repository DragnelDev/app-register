/**
 * Botones de acción del listado de comprobantes según el perfil activo:
 * Importar Excel, Exportar Excel y Registrar comprobante. Se comprueba también
 * que al cambiar de perfil los botones aparecen/desaparecen sin recargar.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import C31ListView from '@/modules/c31-gastos/views/C31ListView.vue'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '@/services/auth.service'
import { c31Service } from '@/services/c31.service'
import { usuarioCon } from '@/test/fixtures'
import type { RolUsuario } from '@/types/common.types'

vi.mock('@/services/auth.service', () => ({ authService: { cambiarPerfil: vi.fn() } }))
vi.mock('@/services/gestion.service', () => ({
  parametrosGestionService: { list: vi.fn().mockResolvedValue([]) },
}))
vi.mock('@/services/c31.service', () => ({
  c31Service: {
    list: vi.fn(),
    listGestiones: vi.fn(),
  },
}))

async function montar(rol: RolUsuario, roles: RolUsuario[] = [rol]) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  auth.usuario = usuarioCon(rol, roles)
  auth.accessToken = 'token'

  vi.mocked(c31Service.list).mockResolvedValue({ data: [], total: 0 } as never)
  vi.mocked(c31Service.listGestiones).mockResolvedValue([2026] as never)

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/c31/con-imputacion', component: C31ListView, meta: { tipoC31: 'CON_IMPUTACION' } },
      { path: '/:pathMatch(.*)*', component: { render: () => null } },
    ],
  })
  await router.push('/c31/con-imputacion')
  await router.isReady()

  const wrapper = mount(C31ListView, {
    global: {
      plugins: [pinia, router],
      // Se aíslan los hijos pesados: aquí solo interesa la barra de acciones
      stubs: { C31FilterBar: true, C31DetailModal: true },
    },
  })
  await flushPromises()
  return { wrapper, auth }
}

const texto = (w: Awaited<ReturnType<typeof montar>>['wrapper']) => w.text()

beforeEach(() => {
  localStorage.clear()
  vi.mocked(authService.cambiarPerfil).mockReset()
})

describe('C31ListView · botones según perfil', () => {
  it.each(['ADMIN', 'OPERADOR_ARCHIVOS'] as const)(
    '%s ve Importar, Exportar y Registrar',
    async (rol) => {
      const { wrapper } = await montar(rol)
      expect(texto(wrapper)).toContain('Importar Excel')
      expect(texto(wrapper)).toContain('Exportar a Excel')
      expect(texto(wrapper)).toContain('Registrar comprobante')
    },
  )

  it.each([
    'SOLO_LECTURA',
    'CONSULTA_EXTERNA',
    'CONSULTA_AVANZADA',
    'REMITENTE_C31',
    'AUXILIAR_ARCHIVOS',
  ] as const)('%s NO ve el botón de importación', async (rol) => {
    const { wrapper } = await montar(rol)
    expect(texto(wrapper)).not.toContain('Importar Excel')
  })

  it.each(['SOLO_LECTURA', 'CONSULTA_EXTERNA'] as const)(
    '%s es de solo consulta: sin importar, exportar, registrar ni PDF',
    async (rol) => {
      const { wrapper } = await montar(rol)
      const t = texto(wrapper)
      expect(t).not.toContain('Importar Excel')
      expect(t).not.toContain('Exportar a Excel')
      expect(t).not.toContain('Registrar comprobante')
      expect(t).not.toContain('Descargar PDF')
    },
  )

  it('CONSULTA_AVANZADA puede exportar pero no registrar', async () => {
    const { wrapper } = await montar('CONSULTA_AVANZADA')
    expect(texto(wrapper)).toContain('Exportar a Excel')
    expect(texto(wrapper)).not.toContain('Registrar comprobante')
  })
})

describe('C31ListView · cambio de perfil en caliente', () => {
  it('de ADMIN a SOLO_LECTURA desaparecen importar, exportar y registrar', async () => {
    const { wrapper, auth } = await montar('ADMIN', ['ADMIN', 'SOLO_LECTURA'])
    expect(texto(wrapper)).toContain('Importar Excel')

    vi.mocked(authService.cambiarPerfil).mockResolvedValue({
      accessToken: 't2',
      rol: 'SOLO_LECTURA',
      roles: ['ADMIN', 'SOLO_LECTURA'],
    })
    await auth.cambiarPerfil('SOLO_LECTURA')
    await flushPromises()

    expect(texto(wrapper)).not.toContain('Importar Excel')
    expect(texto(wrapper)).not.toContain('Exportar a Excel')
    expect(texto(wrapper)).not.toContain('Registrar comprobante')
  })

  it('de SOLO_LECTURA a OPERADOR_ARCHIVOS aparecen las acciones', async () => {
    const { wrapper, auth } = await montar('SOLO_LECTURA', ['SOLO_LECTURA', 'OPERADOR_ARCHIVOS'])
    expect(texto(wrapper)).not.toContain('Importar Excel')

    vi.mocked(authService.cambiarPerfil).mockResolvedValue({
      accessToken: 't3',
      rol: 'OPERADOR_ARCHIVOS',
      roles: ['SOLO_LECTURA', 'OPERADOR_ARCHIVOS'],
    })
    await auth.cambiarPerfil('OPERADOR_ARCHIVOS')
    await flushPromises()

    expect(texto(wrapper)).toContain('Importar Excel')
    expect(texto(wrapper)).toContain('Registrar comprobante')
  })
})
