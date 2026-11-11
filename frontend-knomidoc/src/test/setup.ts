/**
 * Preparación global de las pruebas (se ejecuta antes de cada archivo de test).
 */
import { config } from '@vue/test-utils'
import { vi } from 'vitest'

// Node ≥ 22 trae su propio `localStorage` experimental (global getter) que, sin
// el flag --localstorage-file, devuelve `undefined` y TAPA el de jsdom. Se
// instala un Storage en memoria, idéntico en comportamiento, para que las
// pruebas no dependan de la versión de Node ni de flags.
class MemoryStorage implements Storage {
  private datos = new Map<string, string>()
  get length() {
    return this.datos.size
  }
  clear() {
    this.datos.clear()
  }
  getItem(key: string) {
    return this.datos.has(key) ? this.datos.get(key)! : null
  }
  key(index: number) {
    return Array.from(this.datos.keys())[index] ?? null
  }
  removeItem(key: string) {
    this.datos.delete(key)
  }
  setItem(key: string, value: string) {
    this.datos.set(key, String(value))
  }
  [name: string]: unknown
}

for (const nombre of ['localStorage', 'sessionStorage'] as const) {
  Object.defineProperty(globalThis, nombre, {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  })
}

// jsdom no implementa window.scrollTo y el router lo llama en cada navegación
// (scrollBehavior): sin esto la consola se llena de "Not implemented: scrollTo".
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo

// BaseModal usa <Teleport to="body">: se "stubea" para que su contenido se
// renderice dentro del wrapper y pueda consultarse con wrapper.find(...).
config.global.stubs = { ...config.global.stubs, teleport: true }

// Red de seguridad: el cliente HTTP real importa el router (y con él TODAS las
// vistas). Ninguna prueba debe hacer HTTP; cada spec mockea su servicio concreto.
vi.mock('@/services/api.client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))
