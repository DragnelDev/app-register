/**
 * DigitalizacionModal: fotos → PDF.
 *
 * jsdom no implementa createImageBitmap, canvas, URL.createObjectURL ni
 * drag & drop, así que se simulan:
 *   - Cada imagen procesada es un Blob cuyo TAMAÑO es su N° de procesamiento
 *     (1, 2, 3…): permite saber qué página es cuál al verificar el orden de envío.
 *   - createObjectURL devuelve "blob:mock-N" (N = orden de creación).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { AxiosError } from 'axios'
import DigitalizacionModal from '@/modules/c31-gastos/components/DigitalizacionModal.vue'
import { c31Service } from '@/services/c31.service'

vi.mock('@/services/c31.service', () => ({ c31Service: { digitalizar: vi.fn() } }))

const MB = 1024 * 1024
let urlSeq = 0
let blobSeq = 0
const urlsLiberadas: string[] = []

/** Foto "original" pesada (1000 bytes) para que la versión procesada (pequeña) la reemplace. */
const foto = (nombre: string, tipo = 'image/jpeg') =>
  new File(['o'.repeat(1000)], nombre, { type: tipo })

beforeEach(() => {
  urlSeq = 0
  blobSeq = 0
  urlsLiberadas.length = 0
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width: 100, height: 100, close: vi.fn() })),
  )
  URL.createObjectURL = vi.fn(() => `blob:mock-${++urlSeq}`)
  URL.revokeObjectURL = vi.fn((u: string) => void urlsLiberadas.push(u))
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillStyle: '',
    fillRect: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
  })) as never
  HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback, tipo?: string) {
    cb(new Blob(['x'.repeat(++blobSeq)], { type: tipo ?? 'image/jpeg' }))
  } as never
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function montar() {
  return mount(DigitalizacionModal, { props: { modelValue: true, comprobanteId: 7 } })
}
type W = ReturnType<typeof montar>

async function agregar(w: W, archivos: File[]) {
  const entrada = w.find('input[type="file"]')
  Object.defineProperty(entrada.element, 'files', { value: archivos, configurable: true })
  await entrada.trigger('change')
  await flushPromises()
}

const paginas = (w: W) => w.findAll('ul > li')
const srcs = (w: W) => w.findAll('ul > li img').map((i) => i.attributes('src'))
const boton = (w: W, texto: string) => w.findAll('button').find((b) => b.text().includes(texto))!
const accion = (w: W, i: number, titulo: string) => paginas(w)[i]!.find(`button[title="${titulo}"]`)

describe('DigitalizacionModal · previsualización', () => {
  it('muestra una miniatura numerada por imagen agregada, con su contador', async () => {
    const w = montar()
    await agregar(w, [foto('a.jpg'), foto('b.png', 'image/png'), foto('c.jpg')])

    expect(paginas(w)).toHaveLength(3)
    expect(srcs(w)).toEqual(['blob:mock-1', 'blob:mock-2', 'blob:mock-3'])
    expect(w.findAll('ul > li img').map((i) => i.attributes('alt'))).toEqual([
      'Página 1',
      'Página 2',
      'Página 3',
    ])
    expect(w.text()).toContain('3 página(s)')
  })

  it('sin imágenes: no hay miniaturas y "Generar" está deshabilitado', async () => {
    const w = montar()
    expect(paginas(w)).toHaveLength(0)
    expect(boton(w, 'Generar').attributes('disabled')).toBeDefined()
  })

  it('acepta imágenes soltadas con arrastrar y soltar (drop) y resalta la zona al pasar por encima', async () => {
    const w = montar()
    const zona = w.find('div.border-dashed')

    await zona.trigger('dragover')
    expect(zona.classes()).toContain('border-seal-500')
    await zona.trigger('dragleave')
    expect(zona.classes()).not.toContain('border-seal-500')

    await zona.trigger('drop', { dataTransfer: { files: [foto('a.jpg'), foto('b.jpg')] } })
    await flushPromises()

    expect(paginas(w)).toHaveLength(2)
  })

  describe('validaciones al agregar', () => {
    it('omite archivos que no son JPG/PNG (PDF, .exe) y avisa', async () => {
      const w = montar()
      await agregar(w, [
        new File(['MZ'], 'virus.exe', { type: 'application/x-msdownload' }),
        new File(['%PDF'], 'doc.pdf', { type: 'application/pdf' }),
        foto('ok.jpg'),
      ])

      expect(paginas(w)).toHaveLength(1)
      expect(w.text()).toContain('se omitió: solo se admiten imágenes JPG o PNG')
    })

    it('no pasa de 40 imágenes por PDF', async () => {
      const w = montar()
      await agregar(
        w,
        Array.from({ length: 41 }, (_, i) => foto(`f${i}.jpg`)),
      )

      expect(paginas(w)).toHaveLength(40)
      expect(w.text()).toContain('Máximo 40 imágenes por PDF')
    })

    it('si el navegador no puede leer una imagen muestra el error y sigue usable', async () => {
      vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('imagen dañada')))
      const w = montar()
      await agregar(w, [foto('rota.jpg')])

      expect(w.text()).toContain('imagen dañada')
      expect(paginas(w)).toHaveLength(0)
    })

    it('bloquea el envío si el peso total supera 80 MB (sin llamar al servidor)', async () => {
      // Dos "originales" de 41 MB; el procesado "pesa" más, así que se conserva el original
      HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback) {
        const b = new Blob(['x'])
        Object.defineProperty(b, 'size', { value: 50 * MB })
        cb(b)
      } as never
      const pesada = (n: string) => {
        const f = foto(n)
        Object.defineProperty(f, 'size', { value: 41 * MB })
        return f
      }
      const w = montar()
      await agregar(w, [pesada('a.jpg'), pesada('b.jpg')])

      await boton(w, 'Generar').trigger('click')
      await flushPromises()

      expect(w.text()).toContain('supera 80 MB')
      expect(c31Service.digitalizar).not.toHaveBeenCalled()
    })
  })
})

describe('DigitalizacionModal · reordenamiento', () => {
  async function conTres() {
    const w = montar()
    await agregar(w, [foto('a.jpg'), foto('b.jpg'), foto('c.jpg')])
    return w
  }

  it('"Mover después" intercambia la página con la siguiente', async () => {
    const w = await conTres()

    await accion(w, 0, 'Mover después')!.trigger('click')

    expect(srcs(w)).toEqual(['blob:mock-2', 'blob:mock-1', 'blob:mock-3'])
  })

  it('"Mover antes" intercambia la página con la anterior', async () => {
    const w = await conTres()

    await accion(w, 2, 'Mover antes')!.trigger('click')

    expect(srcs(w)).toEqual(['blob:mock-1', 'blob:mock-3', 'blob:mock-2'])
  })

  it('la primera no puede subir y la última no puede bajar (botones deshabilitados)', async () => {
    const w = await conTres()

    expect(accion(w, 0, 'Mover antes')!.attributes('disabled')).toBeDefined()
    expect(accion(w, 2, 'Mover después')!.attributes('disabled')).toBeDefined()
    expect(accion(w, 1, 'Mover antes')!.attributes('disabled')).toBeUndefined()
  })

  it('arrastrar una miniatura sobre otra cambia su posición', async () => {
    const w = await conTres()

    await paginas(w)[0]!.trigger('dragstart', { dataTransfer: { setData: vi.fn() } })
    await paginas(w)[2]!.trigger('dragover')
    await paginas(w)[2]!.trigger('drop')

    expect(srcs(w)).toEqual(['blob:mock-2', 'blob:mock-3', 'blob:mock-1'])
  })

  it('al reordenar, la numeración visible se recalcula', async () => {
    const w = await conTres()
    await accion(w, 0, 'Mover después')!.trigger('click')

    const numeros = paginas(w).map((li) => li.find('span').text())
    expect(numeros).toEqual(['1', '2', '3'])
  })

  it('"Quitar" elimina la página, libera su vista previa y renumera', async () => {
    const w = await conTres()

    await accion(w, 1, 'Quitar')!.trigger('click')

    expect(paginas(w)).toHaveLength(2)
    expect(srcs(w)).toEqual(['blob:mock-1', 'blob:mock-3'])
    expect(urlsLiberadas).toEqual(['blob:mock-2'])
  })

  it('"Girar 90°" reemplaza la vista previa de esa página sin cambiar su posición', async () => {
    const w = await conTres()

    await accion(w, 1, 'Girar 90°')!.trigger('click')
    await flushPromises()

    expect(srcs(w)).toEqual(['blob:mock-1', 'blob:mock-4', 'blob:mock-3'])
    expect(urlsLiberadas).toEqual(['blob:mock-2'])
  })

  it('el PDF se envía con las imágenes en el orden mostrado', async () => {
    vi.mocked(c31Service.digitalizar).mockResolvedValue({
      ok: true,
      paginas: 3,
      adjunto: { id: 1 },
      url: 'u',
    } as never)
    const w = await conTres()
    await accion(w, 0, 'Mover después')!.trigger('click') // orden: 2, 1, 3

    await boton(w, 'Generar').trigger('click')
    await flushPromises()

    const [id, archivos, tipo] = vi.mocked(c31Service.digitalizar).mock.calls[0]!
    expect(id).toBe(7)
    expect(tipo).toBe('C31')
    // Tamaño del blob = N° de procesamiento: [2, 1, 3] = el orden de la pantalla
    expect((archivos as File[]).map((f) => f.size)).toEqual([2, 1, 3])
    expect((archivos as File[]).map((f) => f.name)).toEqual([
      'pagina-01.jpg',
      'pagina-02.jpg',
      'pagina-03.jpg',
    ])
  })
})

describe('DigitalizacionModal · envío y cierre', () => {
  const exito = { ok: true, paginas: 2, adjunto: { id: 55, nombreOriginal: 'dig.pdf' }, url: 'x' }

  it('tras una subida exitosa avisa (listo) y pide cerrar el modal', async () => {
    vi.mocked(c31Service.digitalizar).mockResolvedValue(exito as never)
    const w = montar()
    await agregar(w, [foto('a.jpg'), foto('b.jpg')])

    await boton(w, 'Generar').trigger('click')
    await flushPromises()

    expect(w.emitted('listo')![0]).toEqual([exito.adjunto, 2])
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual([false])
  })

  it('al cerrarse (v-model = false) libera TODAS las vistas previas y vacía el estado', async () => {
    vi.mocked(c31Service.digitalizar).mockResolvedValue(exito as never)
    const w = montar()
    await agregar(w, [foto('a.jpg'), foto('b.jpg')])
    await boton(w, 'Generar').trigger('click')
    await flushPromises()

    // El padre aplica el v-model y el modal se cierra
    await w.setProps({ modelValue: false })
    await flushPromises()

    expect(urlsLiberadas.sort()).toEqual(['blob:mock-1', 'blob:mock-2'])

    // Al reabrir, está limpio: sin miniaturas, sin error, sin barra de progreso
    await w.setProps({ modelValue: true })
    expect(paginas(w)).toHaveLength(0)
    expect(w.text()).not.toContain('se omitió')
    expect(w.find('[role="status"]').exists()).toBe(false)
    expect(boton(w, 'Generar').attributes('disabled')).toBeDefined()
  })

  it('cancelar y reabrir también limpia los errores y las imágenes', async () => {
    const w = montar()
    await agregar(w, [foto('ok.jpg'), new File(['x'], 'doc.pdf', { type: 'application/pdf' })])
    expect(w.text()).toContain('se omitió')

    await boton(w, 'Cancelar').trigger('click')
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual([false])
    await w.setProps({ modelValue: false })
    await w.setProps({ modelValue: true })

    expect(paginas(w)).toHaveLength(0)
    expect(w.text()).not.toContain('se omitió')
    expect(urlsLiberadas).toEqual(['blob:mock-1'])
  })

  it('si el servidor responde con error muestra su mensaje y CONSERVA las páginas (sin cerrar)', async () => {
    vi.mocked(c31Service.digitalizar).mockRejectedValue(
      new AxiosError('x', undefined, undefined, undefined, {
        status: 400,
        data: { message: 'El peso total supera 80 MB' },
      } as never),
    )
    const w = montar()
    await agregar(w, [foto('a.jpg'), foto('b.jpg')])

    await boton(w, 'Generar').trigger('click')
    await flushPromises()

    expect(w.text()).toContain('El peso total supera 80 MB')
    expect(paginas(w)).toHaveLength(2)
    expect(w.emitted('listo')).toBeUndefined()
    expect(w.emitted('update:modelValue')).toBeUndefined()
    // El botón se rehabilita para reintentar
    expect(boton(w, 'Generar').attributes('disabled')).toBeUndefined()
  })

  it('mientras envía: muestra el progreso, bloquea cancelar y no deja cerrar con la ✕', async () => {
    let terminar!: (v: unknown) => void
    vi.mocked(c31Service.digitalizar).mockImplementation((_id, _files, _tipo, onProgress) => {
      onProgress?.(40)
      return new Promise((ok) => (terminar = ok)) as never
    })
    const w = montar()
    await agregar(w, [foto('a.jpg')])

    await boton(w, 'Generar').trigger('click')
    await flushPromises()

    expect(w.find('[role="status"]').exists()).toBe(true)
    expect(w.text()).toContain('Enviando imágenes… 40%')
    expect(boton(w, 'Cancelar').attributes('disabled')).toBeDefined()

    await w.find('button[aria-label="Cerrar"]').trigger('click')
    expect(w.emitted('update:modelValue')).toBeUndefined()

    terminar(exito)
    await flushPromises()
    expect(w.emitted('listo')).toHaveLength(1)
  })

  it('no permite doble envío (segundo clic mientras envía)', async () => {
    vi.mocked(c31Service.digitalizar).mockImplementation(() => new Promise(() => {}) as never)
    const w = montar()
    await agregar(w, [foto('a.jpg')])

    await boton(w, 'Generar').trigger('click')
    await boton(w, 'Generar').trigger('click')

    expect(c31Service.digitalizar).toHaveBeenCalledTimes(1)
  })

  it('"Adjuntar como" se envía en la llamada (RESPALDO)', async () => {
    vi.mocked(c31Service.digitalizar).mockResolvedValue(exito as never)
    const w = montar()
    await agregar(w, [foto('a.jpg')])

    await w.find('#dig-tipo').setValue('RESPALDO')
    await boton(w, 'Generar').trigger('click')
    await flushPromises()

    expect(vi.mocked(c31Service.digitalizar).mock.calls[0]![2]).toBe('RESPALDO')
  })

  it('al desmontar libera las vistas previas pendientes (sin fugas de memoria)', async () => {
    const w = montar()
    await agregar(w, [foto('a.jpg'), foto('b.jpg')])

    w.unmount()

    expect(urlsLiberadas.sort()).toEqual(['blob:mock-1', 'blob:mock-2'])
  })
})
