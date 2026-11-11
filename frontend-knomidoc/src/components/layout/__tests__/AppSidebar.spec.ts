/**
 * Menú lateral: qué opciones ve cada perfil y cómo cambian al cambiar de perfil
 * (sin recargar la página), porque salen de getters reactivos del store.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '@/services/auth.service'
import { usuarioCon } from '@/test/fixtures'
import type { RolUsuario } from '@/types/common.types'

vi.mock('@/services/auth.service', () => ({
  authService: { cambiarPerfil: vi.fn() },
}))
vi.mock('@/services/resumen.service', () => ({
  resumenService: {
    obtener: vi.fn().mockResolvedValue({ regularizacion: { total: 0 }, archivo: { depositos: 0 } }),
  },
}))

async function montar(rol: RolUsuario, roles: RolUsuario[] = [rol]) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  auth.usuario = usuarioCon(rol, roles)
  auth.accessToken = 'token'

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
  })
  await router.push('/')
  await router.isReady()

  const wrapper = mount(AppSidebar, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, auth }
}

const enlaces = (w: Awaited<ReturnType<typeof montar>>['wrapper']) =>
  w.findAll('a.menu-item').map((a) => a.attributes('href'))

beforeEach(() => {
  localStorage.clear()
  vi.mocked(authService.cambiarPerfil).mockReset()
})

describe('AppSidebar · visibilidad por perfil', () => {
  it.each(['SOLO_LECTURA', 'CONSULTA_EXTERNA'] as const)(
    '%s solo ve los listados de comprobantes (consulta y ubicación)',
    async (rol) => {
      const { wrapper } = await montar(rol)
      expect(enlaces(wrapper)).toEqual(['/c31/con-imputacion', '/c31/sin-imputacion'])
    },
  )

  it('REMITENTE_C31 solo ve sus actas, los listados y el registro de comprobantes', async () => {
    const { wrapper } = await montar('REMITENTE_C31')
    expect(enlaces(wrapper)).toEqual([
      '/actas-entrega',
      '/c31/con-imputacion',
      '/c31/sin-imputacion',
      '/c31/nuevo',
    ])
  })

  it('CONSULTA_AVANZADA ve reportes pero no opciones que modifican ni administran', async () => {
    const { wrapper } = await montar('CONSULTA_AVANZADA')
    const links = enlaces(wrapper)

    expect(links).toContain('/reportes')
    expect(links).toContain('/c31/con-imputacion')
    for (const prohibido of [
      '/c31/nuevo',
      '/c31/vinculos',
      '/usuarios',
      '/parametros',
      '/auditoria',
      '/funcionarios',
    ]) {
      expect(links).not.toContain(prohibido)
    }
  })

  it('AUXILIAR_ARCHIVOS registra y gestiona el archivo físico, sin reportes ni administración', async () => {
    const { wrapper } = await montar('AUXILIAR_ARCHIVOS')
    const links = enlaces(wrapper)

    expect(links).toEqual(expect.arrayContaining(['/c31/nuevo', '/c31/vinculos', '/carpetas']))
    for (const prohibido of [
      '/reportes',
      '/usuarios',
      '/auditoria',
      '/prestamos/cuaderno',
      '/funcionarios',
    ]) {
      expect(links).not.toContain(prohibido)
    }
  })

  it('ENCARGADO_PRESTAMOS ve préstamos y funcionarios, pero no registra comprobantes', async () => {
    const { wrapper } = await montar('ENCARGADO_PRESTAMOS')
    const links = enlaces(wrapper)

    expect(links).toEqual(
      expect.arrayContaining(['/prestamos/cuaderno', '/prestamos/notas', '/funcionarios']),
    )
    expect(links).not.toContain('/c31/nuevo')
    expect(links).not.toContain('/usuarios')
  })

  it('ADMIN ve todo, incluida la administración', async () => {
    const { wrapper } = await montar('ADMIN')
    expect(enlaces(wrapper)).toEqual(
      expect.arrayContaining([
        '/usuarios',
        '/parametros',
        '/auditoria',
        '/reportes',
        '/c31/nuevo',
        '/funcionarios',
      ]),
    )
  })

  it('no deja grupos vacíos: sin ítems visibles no se pinta el título del grupo', async () => {
    const { wrapper } = await montar('SOLO_LECTURA')
    const titulos = wrapper.findAll('.menu-category').map((t) => t.text())
    expect(titulos).toEqual(['Gestión SIGEP (Gastos)'])
  })
})

describe('AppSidebar · cambio de perfil en caliente', () => {
  it('al pasar de ADMIN a SOLO_LECTURA desaparecen las opciones restringidas', async () => {
    const { wrapper, auth } = await montar('ADMIN', ['ADMIN', 'SOLO_LECTURA'])
    expect(enlaces(wrapper)).toContain('/usuarios')
    expect(enlaces(wrapper)).toContain('/c31/nuevo')

    vi.mocked(authService.cambiarPerfil).mockResolvedValue({
      accessToken: 't2',
      rol: 'SOLO_LECTURA',
      roles: ['ADMIN', 'SOLO_LECTURA'],
    })
    await auth.cambiarPerfil('SOLO_LECTURA')
    await flushPromises()

    expect(enlaces(wrapper)).toEqual(['/c31/con-imputacion', '/c31/sin-imputacion'])
  })

  it('al volver a ADMIN las opciones reaparecen', async () => {
    const { wrapper, auth } = await montar('SOLO_LECTURA', ['ADMIN', 'SOLO_LECTURA'])
    expect(enlaces(wrapper)).not.toContain('/usuarios')

    vi.mocked(authService.cambiarPerfil).mockResolvedValue({
      accessToken: 't3',
      rol: 'ADMIN',
      roles: ['ADMIN', 'SOLO_LECTURA'],
    })
    await auth.cambiarPerfil('ADMIN')
    await flushPromises()

    expect(enlaces(wrapper)).toContain('/usuarios')
    expect(enlaces(wrapper)).toContain('/auditoria')
  })

  it('cerrar sesión retira todas las opciones que dependen de un perfil', async () => {
    const { wrapper, auth } = await montar('ADMIN')
    expect(enlaces(wrapper)).toContain('/usuarios')

    auth.logout()
    await flushPromises()

    // (las opciones sin restricción de rol dependen del router guard, que no
    // deja ver el layout sin sesión; aquí solo importa que nada "con rol" quede)
    for (const restringido of [
      '/usuarios',
      '/auditoria',
      '/reportes',
      '/c31/nuevo',
      '/funcionarios',
    ]) {
      expect(enlaces(wrapper)).not.toContain(restringido)
    }
  })
})
