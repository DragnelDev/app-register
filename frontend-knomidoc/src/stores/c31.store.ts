import { defineStore } from 'pinia'
import { c31Service } from '@/services/c31.service'
import type {
  ComprobanteC31,
  ComprobanteC31FormPayload,
  C31FilterState,
  C31ImportResult,
} from '@/types/c31.types'

interface C31State {
  items: ComprobanteC31[]
  total: number
  page: number
  pageSize: number
  filters: C31FilterState
  loading: boolean
  selected: ComprobanteC31 | null
  gestiones: number[]
}

export const useC31Store = defineStore('c31', {
  state: (): C31State => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    filters: {
      search: '',
      estadoFisico: '',
      tipoC31: '',
      fechaDesde: '',
      fechaHasta: '',
      gestion: '',
    },
    loading: false,
    selected: null,
    gestiones: [],
  }),

  getters: {
    totalPages: (state) => Math.max(1, Math.ceil(state.total / state.pageSize)),
    prestados: (state) => state.items.filter((c) => c.estadoFisico === 'PRESTADO'),
    pendientes: (state) => state.items.filter((c) => c.estadoFisico === 'EN_ARCHIVO'),
  },

  actions: {
    setFilters(filters: Partial<C31FilterState>) {
      this.filters = { ...this.filters, ...filters }
      this.page = 1
    },

    async fetchList() {
      this.loading = true
      try {
        const res = await c31Service.list({
          page: this.page,
          pageSize: this.pageSize,
          ...this.filters,
        })
        this.items = res.data
        this.total = res.total
      } finally {
        this.loading = false
      }
    },

    async fetchGestiones() {
      this.gestiones = await c31Service.listGestiones()
    },

    async fetchOne(id: string) {
      this.selected = await c31Service.getById(id)
      return this.selected
    },

    async anular(id: string) {
      const updated = await c31Service.cambiarEstadoFisico(id, 'ANULADO')
      this.replaceInList(updated)
      return updated
    },

    /** Edición manual (folio, cheques, ubicación/carpeta, estado, etc.) */
    async update(id: string, payload: Partial<ComprobanteC31FormPayload>) {
      const updated = await c31Service.update(id, payload)
      this.replaceInList(updated)
      if (this.selected?.id === id) this.selected = updated
      return updated
    },

    async exportExcel() {
      await c31Service.exportExcel(this.filters.gestion)
    },

    async importExcel(file: File, gestion: number): Promise<C31ImportResult> {
      const resultado = await c31Service.importExcel(file, gestion)
      await this.fetchGestiones()
      await this.fetchList()
      return resultado
    },

    replaceInList(updated: ComprobanteC31) {
      const idx = this.items.findIndex((c) => c.id === updated.id)
      if (idx !== -1) this.items[idx] = updated
    },
  },
})
