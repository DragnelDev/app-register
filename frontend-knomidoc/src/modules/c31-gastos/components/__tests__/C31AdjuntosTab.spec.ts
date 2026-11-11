/**
 * Pestaña "Adjuntos" del comprobante: el acceso a la digitalización y a la
 * subida/eliminación depende de `puedeEditar`, que el modal padre calcula como
 * `auth.puedeRegistrarC31 && estado !== 'ANULADO'`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import C31AdjuntosTab from '@/modules/c31-gastos/components/C31AdjuntosTab.vue'
import DigitalizacionModal from '@/modules/c31-gastos/components/DigitalizacionModal.vue'
import { c31Service } from '@/services/c31.service'

vi.mock('@/services/c31.service', () => ({
  c31Service: {
    listAdjuntos: vi.fn(),
    subirAdjunto: vi.fn(),
    eliminarAdjunto: vi.fn(),
    obtenerAdjunto: vi.fn(),
    digitalizar: vi.fn(),
  },
}))

const ADJUNTO = {
  id: 1,
  comprobanteId: 7,
  tipo: 'C31',
  nombreOriginal: 'c31-escaneado.pdf',
  mimeType: 'application/pdf',
  tamano: 2048,
  fechaCarga: '2026-03-01T10:00:00Z',
}

async function montar(puedeEditar: boolean) {
  vi.mocked(c31Service.listAdjuntos).mockResolvedValue([ADJUNTO] as never)
  const w = mount(C31AdjuntosTab, {
    props: { comprobanteId: 7, puedeEditar },
    global: { stubs: { DigitalizacionModal: true } },
  })
  await flushPromises()
  return w
}

beforeEach(() => {
  vi.mocked(c31Service.listAdjuntos).mockReset()
})

describe('C31AdjuntosTab · permisos de edición', () => {
  it('solo lectura: lista los archivos pero oculta digitalización, subida y eliminación', async () => {
    const w = await montar(false)

    expect(w.text()).toContain('c31-escaneado.pdf')
    expect(w.text()).not.toContain('Digitalización rápida')
    expect(w.text()).not.toContain('Seleccionar archivos')
    expect(w.find('input[type="file"]').exists()).toBe(false)
    expect(w.find('select#adj-tipo').exists()).toBe(false)
    expect(w.find('[aria-label="Eliminar"], [title="Eliminar"]').exists()).toBe(false)
    // Ver y descargar siguen disponibles
    expect(w.find('[aria-label="Descargar"], [title="Descargar"]').exists()).toBe(true)
  })

  it('con permiso: muestra digitalización, selector de tipo, subida y eliminación', async () => {
    const w = await montar(true)

    expect(w.text()).toContain('Digitalización rápida')
    expect(w.text()).toContain('Seleccionar archivos')
    expect(w.find('input[type="file"]').exists()).toBe(true)
    expect(w.find('select#adj-tipo').exists()).toBe(true)
    expect(w.find('[aria-label="Eliminar"], [title="Eliminar"]').exists()).toBe(true)
  })

  it('soltar archivos sin permiso no sube nada', async () => {
    const w = await montar(false)
    // Sin zona de drop renderizada no hay cómo subir: el servicio nunca se invoca
    expect(w.find('div.border-dashed').exists()).toBe(false)
    expect(c31Service.subirAdjunto).not.toHaveBeenCalled()
  })
})

describe('C31AdjuntosTab · digitalización', () => {
  it('el botón abre el modal de digitalización', async () => {
    const w = await montar(true)
    const modal = () => w.findComponent(DigitalizacionModal)
    expect(modal().props('modelValue')).toBe(false)

    const boton = w.findAll('button').find((b) => b.text().includes('Digitalización rápida'))!
    await boton.trigger('click')

    expect(modal().props('modelValue')).toBe(true)
    expect(modal().props('comprobanteId')).toBe(7)
  })

  it('al terminar la digitalización recarga la lista, avisa al padre y muestra el resultado', async () => {
    const w = await montar(true)
    expect(c31Service.listAdjuntos).toHaveBeenCalledTimes(1)

    w.findComponent(DigitalizacionModal).vm.$emit('listo', { ...ADJUNTO, id: 2 }, 3)
    await flushPromises()

    expect(c31Service.listAdjuntos).toHaveBeenCalledTimes(2)
    expect(w.emitted('cambio')).toHaveLength(1)
    expect(w.text()).toContain('PDF generado con 3 página(s)')
  })
})

describe('C31AdjuntosTab · subida de archivos', () => {
  const subir = async (w: Awaited<ReturnType<typeof montar>>, archivos: File[]) => {
    const input = w.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: archivos, configurable: true })
    await input.trigger('change')
    await flushPromises()
  }

  it('rechaza formatos no permitidos (.exe) sin llamar al servidor', async () => {
    const w = await montar(true)
    await subir(w, [new File(['MZ'], 'setup.exe', { type: 'application/x-msdownload' })])

    expect(w.text()).toContain('solo se admiten PDF o imágenes')
    expect(c31Service.subirAdjunto).not.toHaveBeenCalled()
  })

  it('rechaza archivos de más de 20 MB sin llamar al servidor', async () => {
    const w = await montar(true)
    const grande = new File(['x'], 'grande.pdf', { type: 'application/pdf' })
    Object.defineProperty(grande, 'size', { value: 21 * 1024 * 1024 })

    await subir(w, [grande])

    expect(w.text()).toContain('supera el máximo de 20 MB')
    expect(c31Service.subirAdjunto).not.toHaveBeenCalled()
  })

  it('sube un PDF válido con el tipo elegido y refresca la lista', async () => {
    vi.mocked(c31Service.subirAdjunto).mockResolvedValue(ADJUNTO as never)
    const w = await montar(true)
    await w.find('select#adj-tipo').setValue('RESPALDO')

    await subir(w, [new File(['%PDF'], 'respaldo.pdf', { type: 'application/pdf' })])

    expect(c31Service.subirAdjunto).toHaveBeenCalledWith(7, expect.any(File), 'RESPALDO')
    expect(c31Service.listAdjuntos).toHaveBeenCalledTimes(2)
    expect(w.emitted('cambio')).toHaveLength(1)
  })
})
