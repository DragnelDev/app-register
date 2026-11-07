import { defineStore } from 'pinia'
import { useGestionStore } from '@/stores/gestion.store'
import type {
  CuadernoFilterState,
  DevolverPrestamoCuadernoPayload,
  DevolverPrestamoNotaPayload,
  PrestamoCuaderno,
  PrestamoNota,
} from '@/types/prestamos.types'
import { prestamosService } from '@/services/prestamos.service'

interface PrestamosState {
  cuaderno: PrestamoCuaderno[]
  cuadernoTotal: number
  cuadernoPage: number
  cuadernoPageSize: number
  cuadernoFiltros: CuadernoFilterState
  notas: PrestamoNota[]
  notasFiltros: Record<string, string | number | undefined>
  loadingCuaderno: boolean
  loadingNotas: boolean
}

export const filtrosCuadernoVacios = (): CuadernoFilterState => ({
  gestion: useGestionStore().seleccionada,
  fechaDesde: '',
  fechaHasta: '',
  funcionarioId: null,
  unidad: '',
  estado: '',
})

export const usePrestamosStore = defineStore('prestamos', {
  state: (): PrestamosState => ({
    cuaderno: [],
    cuadernoTotal: 0,
    cuadernoPage: 1,
    cuadernoPageSize: 15,
    cuadernoFiltros: filtrosCuadernoVacios(),
    notas: [],
    notasFiltros: {},
    loadingCuaderno: false,
    loadingNotas: false,
  }),

  getters: {
    cuadernoPrestados: (state) => state.cuaderno.filter((p) => !p.devuelto),
    notasPrestadas: (state) => state.notas.filter((n) => n.estadoPrestamo === 'ENTREGADO'),
    cuadernoTotalPages: (state) =>
      Math.max(1, Math.ceil(state.cuadernoTotal / state.cuadernoPageSize)),
  },

  actions: {
    setFiltrosCuaderno(filtros: CuadernoFilterState) {
      this.cuadernoFiltros = { ...filtros }
      this.cuadernoPage = 1
    },

    async fetchCuaderno() {
      this.loadingCuaderno = true
      try {
        const res = await prestamosService.listCuaderno(
          { page: this.cuadernoPage, pageSize: this.cuadernoPageSize },
          this.cuadernoFiltros,
        )
        this.cuaderno = res.data
        this.cuadernoTotal = res.total
      } finally {
        this.loadingCuaderno = false
      }
    },

    async fetchNotas() {
      this.loadingNotas = true
      try {
        const filtros = Object.fromEntries(
          Object.entries(this.notasFiltros).filter(([, v]) => v !== '' && v !== undefined),
        )
        const res = await prestamosService.listNotas({ pageSize: 100, ...filtros })
        this.notas = res.data
      } finally {
        this.loadingNotas = false
      }
    },

    async devolverCuaderno(id: string, payload: DevolverPrestamoCuadernoPayload = {}) {
      const updated = await prestamosService.devolverCuaderno(id, payload)
      const idx = this.cuaderno.findIndex((p) => p.id === id)
      if (idx !== -1) this.cuaderno[idx] = updated
    },

    /** Devuelve todos los comprobantes del lote de una sola vez. */
    async devolverLoteCuaderno(loteId: string, payload: DevolverPrestamoCuadernoPayload = {}) {
      await prestamosService.devolverLoteCuaderno(loteId, payload)
      await this.fetchCuaderno()
    },

    /** Devuelve todos los comprobantes de la nota de una sola vez. */
    async devolverNotaCompleta(numeroNota: string, payload: DevolverPrestamoNotaPayload = {}) {
      await prestamosService.devolverNotaCompleta(numeroNota, payload)
      await this.fetchNotas()
    },

    async devolverNota(id: string, payload: DevolverPrestamoNotaPayload = {}) {
      const updated = await prestamosService.devolverNota(id, payload)
      const idx = this.notas.findIndex((n) => n.id === id)
      if (idx !== -1) this.notas[idx] = updated
    },

    /** Descarta una nota en borrador. */
    async descartarBorrador(numeroNota: string) {
      await prestamosService.descartarBorrador(numeroNota)
      await this.fetchNotas()
    },
  },
})
