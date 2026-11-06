import { defineStore } from 'pinia'
import { funcionariosService } from '@/services/funcionarios.service'
import type { Funcionario, FuncionarioPayload } from '@/types/funcionarios.types'

interface FuncionariosState {
  items: Funcionario[]
  total: number
  page: number
  pageSize: number
  search: string
  estado: '' | 'ACTIVO' | 'INACTIVO'
  loading: boolean
}

export const useFuncionariosStore = defineStore('funcionarios', {
  state: (): FuncionariosState => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 15,
    search: '',
    estado: '',
    loading: false,
  }),

  getters: {
    totalPages: (state) => Math.max(1, Math.ceil(state.total / state.pageSize)),
  },

  actions: {
    async fetchList() {
      this.loading = true
      try {
        const res = await funcionariosService.list({
          page: this.page,
          pageSize: this.pageSize,
          search: this.search.trim() || undefined,
          estado: this.estado || undefined,
        })
        this.items = res.data
        this.total = res.total
      } finally {
        this.loading = false
      }
    },

    setFilters(filters: { search?: string; estado?: '' | 'ACTIVO' | 'INACTIVO' }) {
      if (filters.search !== undefined) this.search = filters.search
      if (filters.estado !== undefined) this.estado = filters.estado
      this.page = 1
    },

    async crear(payload: FuncionarioPayload) {
      const creado = await funcionariosService.create(payload)
      await this.fetchList()
      return creado
    },

    async actualizar(id: number, payload: Partial<FuncionarioPayload>) {
      const actualizado = await funcionariosService.update(id, payload)
      await this.fetchList()
      return actualizado
    },

    async eliminar(id: number) {
      await funcionariosService.remove(id)
      await this.fetchList()
    },
  },
})
