/**
 * Tabla de selección de comprobantes del acta de entrega (ActaEntregaModal).
 *
 * Verifica la selección masiva ("Marcar todos") y el contador dinámico.
 *
 * NOTA sobre el requisito "contador de fojas útiles": el sistema NO maneja
 * fojas útiles. El contador real del modal es
 *     "N marcado(s) · Total Bs X"
 * (cantidad de comprobantes y suma de sus montos), y es lo que se prueba.
 * Si más adelante se agrega "fojas útiles", este es el lugar donde extender.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ActaEntregaModal from '@/modules/actas-entrega/components/ActaEntregaModal.vue'
import { useAuthStore } from '@/stores/auth.store'
import { c31Service } from '@/services/c31.service'
import { actasEntregaService } from '@/services/actas-entrega.service'
import { bs } from '@/utils/estados'
import { comprobanteC31, usuarioCon } from '@/test/fixtures'

vi.mock('@/services/auth.service', () => ({ authService: {} }))
vi.mock('@/services/c31.service', () => ({ c31Service: { list: vi.fn() } }))
vi.mock('@/services/actas-entrega.service', () => ({
  actasEntregaService: { candidatos: vi.fn() },
}))

const C1 = comprobanteC31(1, 1000, '11')
const C2 = comprobanteC31(2, 2500.5, '12')
const C3 = comprobanteC31(3, 499.5, '13')
const TODOS = [C1, C2, C3]
const TOTAL_TODOS = 4000

async function montar(
  opciones: { rol?: 'OPERADOR_ARCHIVOS' | 'REMITENTE_C31'; acta?: unknown } = {},
) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().usuario = usuarioCon(opciones.rol ?? 'OPERADOR_ARCHIVOS')

  vi.mocked(c31Service.list).mockResolvedValue({ data: TODOS } as never)
  vi.mocked(actasEntregaService.candidatos).mockResolvedValue(TODOS as never)

  const wrapper = mount(ActaEntregaModal, {
    props: { modelValue: true, acta: (opciones.acta ?? null) as never },
    global: { plugins: [pinia] },
  })
  await flushPromises()
  return wrapper
}

type W = Awaited<ReturnType<typeof montar>>

const checkTodos = (w: W) => w.find('input[aria-label="Marcar todos"]')
const checksFilas = (w: W) => w.findAll('tbody input[type="checkbox"]')
const marcado = (el: { element: Element }) => (el.element as HTMLInputElement).checked
const contador = (w: W) => w.text().replace(/\s+/g, ' ')

beforeEach(() => {
  localStorage.clear()
})

describe('ActaEntregaModal · selección masiva', () => {
  it('carga los comprobantes "En revisión" sin acta y arranca sin nada marcado', async () => {
    const w = await montar()

    expect(c31Service.list).toHaveBeenCalledWith(
      expect.objectContaining({ estadoFisico: 'EN_REVISION', sinActa: true }),
    )
    expect(checksFilas(w)).toHaveLength(3)
    expect(checksFilas(w).some(marcado)).toBe(false)
    expect(marcado(checkTodos(w))).toBe(false)
    expect(contador(w)).toMatch(/0 marcado\(s\) · Total Bs/)
    expect(contador(w)).toContain(bs(0))
  })

  it('"Marcar todos" marca todos los registros visibles y actualiza el contador', async () => {
    const w = await montar()

    await checkTodos(w).setValue(true)

    expect(checksFilas(w).every(marcado)).toBe(true)
    expect(marcado(checkTodos(w))).toBe(true)
    expect(contador(w)).toMatch(/3 marcado\(s\)/)
    expect(contador(w)).toContain(`Total Bs ${bs(TOTAL_TODOS)}`)
  })

  it('"Marcar todos" otra vez desmarca todo y el contador vuelve a cero', async () => {
    const w = await montar()
    await checkTodos(w).setValue(true)

    await checkTodos(w).setValue(false)

    expect(checksFilas(w).some(marcado)).toBe(false)
    expect(contador(w)).toMatch(/0 marcado\(s\)/)
    expect(contador(w)).toContain(`Total Bs ${bs(0)}`)
  })

  it('el contador y el total se actualizan en tiempo real fila por fila', async () => {
    const w = await montar()

    await checksFilas(w)[0]!.setValue(true)
    expect(contador(w)).toMatch(/1 marcado\(s\)/)
    expect(contador(w)).toContain(`Total Bs ${bs(1000)}`)

    await checksFilas(w)[1]!.setValue(true)
    expect(contador(w)).toMatch(/2 marcado\(s\)/)
    expect(contador(w)).toContain(`Total Bs ${bs(3500.5)}`)

    await checksFilas(w)[0]!.setValue(false)
    expect(contador(w)).toMatch(/1 marcado\(s\)/)
    expect(contador(w)).toContain(`Total Bs ${bs(2500.5)}`)
  })

  it('el checkbox general se desmarca si se quita una fila y se re-marca al completar', async () => {
    const w = await montar()
    await checkTodos(w).setValue(true)

    await checksFilas(w)[2]!.setValue(false)
    expect(marcado(checkTodos(w))).toBe(false)
    expect(contador(w)).toMatch(/2 marcado\(s\)/)

    await checksFilas(w)[2]!.setValue(true)
    expect(marcado(checkTodos(w))).toBe(true)
    expect(contador(w)).toMatch(/3 marcado\(s\)/)
  })

  it('un clic en la fila (no solo en el checkbox) también la marca', async () => {
    const w = await montar()

    await w.findAll('tbody tr')[1]!.trigger('click')

    expect(marcado(checksFilas(w)[1]!)).toBe(true)
    expect(contador(w)).toMatch(/1 marcado\(s\)/)
  })

  it('con una lista vacía el checkbox general está deshabilitado', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useAuthStore().usuario = usuarioCon('OPERADOR_ARCHIVOS')
    vi.mocked(c31Service.list).mockResolvedValue({ data: [] } as never)
    const w = mount(ActaEntregaModal, { props: { modelValue: true }, global: { plugins: [pinia] } })
    await flushPromises()

    expect((checkTodos(w).element as HTMLInputElement).disabled).toBe(true)
    expect(w.text()).toContain('No hay comprobantes firmados pendientes de entrega')
  })

  describe('"Ver solo los marcados"', () => {
    it('filtra la tabla a lo marcado y el checkbox general refleja que todo lo visible está marcado', async () => {
      const w = await montar()
      await checksFilas(w)[0]!.setValue(true)
      await checksFilas(w)[2]!.setValue(true)

      await w.find('label input[type="checkbox"]').setValue(true) // "Ver solo los marcados"

      expect(checksFilas(w)).toHaveLength(2)
      expect(marcado(checkTodos(w))).toBe(true)
      expect(contador(w)).toMatch(/2 marcado\(s\)/)
      expect(contador(w)).toContain(`Total Bs ${bs(1499.5)}`)
    })

    it('sin nada marcado muestra el mensaje de "No hay comprobantes marcados"', async () => {
      const w = await montar()
      await w.find('label input[type="checkbox"]').setValue(true)
      expect(w.text()).toContain('No hay comprobantes marcados')
    })
  })

  describe('guardar', () => {
    it('sin ningún comprobante marcado muestra el error y NO emite "save"', async () => {
      const w = await montar({ rol: 'REMITENTE_C31' })

      await w.find('#acta-entrega-form').trigger('submit')

      expect(w.text()).toContain('Marque al menos un comprobante a entregar')
      expect(w.emitted('save')).toBeUndefined()
    })

    it('con "Marcar todos" emite "save" con los ids seleccionados (perfil remitente)', async () => {
      const w = await montar({ rol: 'REMITENTE_C31' })
      // El remitente no usa el listado general: usa el endpoint de candidatos
      expect(actasEntregaService.candidatos).toHaveBeenCalled()
      expect(c31Service.list).not.toHaveBeenCalled()

      await checkTodos(w).setValue(true)
      await w.find('#acta-entrega-form').trigger('submit')

      const evento = w.emitted('save')
      expect(evento).toHaveLength(1)
      expect((evento![0]![0] as { comprobanteIds: number[] }).comprobanteIds).toEqual([1, 2, 3])
    })
  })

  describe('limpieza al reabrir', () => {
    it('cerrar y reabrir el modal reinicia la selección', async () => {
      const w = await montar()
      await checkTodos(w).setValue(true)
      expect(contador(w)).toMatch(/3 marcado\(s\)/)

      await w.setProps({ modelValue: false })
      await w.setProps({ modelValue: true })
      await flushPromises()

      expect(checksFilas(w).some(marcado)).toBe(false)
      expect(contador(w)).toMatch(/0 marcado\(s\)/)
    })
  })

  describe('acta ya recibida (solo lectura)', () => {
    const actaRecibida = {
      id: '9',
      numeroActa: 'AE-2026-001',
      estado: 'RECIBIDA',
      comprobantesC31: [C1, C2],
    }

    it('muestra solo lo enviado, deshabilita los checks y no permite cambiar la selección', async () => {
      const w = await montar({ acta: actaRecibida })

      expect(checksFilas(w)).toHaveLength(2)
      expect(checksFilas(w).every((c) => (c.element as HTMLInputElement).disabled)).toBe(true)
      expect((checkTodos(w).element as HTMLInputElement).disabled).toBe(true)
      expect(contador(w)).toMatch(/2 enviado\(s\)/)

      await w.findAll('tbody tr')[0]!.trigger('click')
      await checkTodos(w).trigger('change')

      expect(contador(w)).toMatch(/2 enviado\(s\)/)
      expect(contador(w)).toContain(`Total Bs ${bs(3500.5)}`)
    })

    it('no consulta pendientes: solo lo que ya contiene el acta', async () => {
      await montar({ acta: actaRecibida })
      expect(c31Service.list).not.toHaveBeenCalled()
    })
  })
})
