import { defineStore } from 'pinia'
import { c31Service } from '@/services/c31.service'
import type { ComprobanteC31, C31FilterState } from '@/types/c31.types'

interface C31State {
  items: ComprobanteC31[]
  total: number
  page: number
  pageSize: number
  filters: C31FilterState
  loading: boolean
  selected: ComprobanteC31 | null
}

export const useC31Store = defineStore('c31', {
  state: (): C31State => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    filters: {
      search: '',
      estadoAprobacion: '',
      estadoFisico: '',
      fechaDesde: '',
      fechaHasta: '',
    },
    loading: false,
    selected: null,
  }),

  getters: {
    totalPages: (state) => Math.max(1, Math.ceil(state.total / state.pageSize)),
    pendientes: (state) => state.items.filter((c) => c.estadoAprobacion === 'PENDIENTE'),
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

    async fetchOne(id: string) {
      this.selected = await c31Service.getById(id)
      return this.selected
    },

    async aprobar(id: string) {
      const updated = await c31Service.aprobar(id)
      this.replaceInList(updated)
    },

    async rechazar(id: string, motivo: string) {
      const updated = await c31Service.rechazar(id, motivo)
      this.replaceInList(updated)
    },

    replaceInList(updated: ComprobanteC31) {
      const idx = this.items.findIndex((c) => c.id === updated.id)
      if (idx !== -1) this.items[idx] = updated
    },
  },
})
