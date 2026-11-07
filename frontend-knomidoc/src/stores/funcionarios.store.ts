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
  unidad: string
  cargo: string
  conHuella: '' | 'true' | 'false'
  conPrestamosActivos: '' | 'true'
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
    unidad: '',
    cargo: '',
    conHuella: '',
    conPrestamosActivos: '',
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
          unidad: this.unidad || undefined,
          cargo: this.cargo.trim() || undefined,
          conHuella: this.conHuella || undefined,
          conPrestamosActivos: this.conPrestamosActivos || undefined,
        })
        this.items = res.data
        this.total = res.total
      } finally {
        this.loading = false
      }
    },

    setFilters(
      filters: Partial<
        Pick<FuncionariosState, 'search' | 'estado' | 'unidad' | 'cargo' | 'conHuella' | 'conPrestamosActivos'>
      >,
    ) {
      Object.assign(this, filters)
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
