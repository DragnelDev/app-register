import { defineStore } from 'pinia'
import { prestamosService } from '@/services/prestamos.service'
import type { PrestamoCuaderno, PrestamoNota } from '@/types/prestamos.types'

interface PrestamosState {
  cuaderno: PrestamoCuaderno[]
  notas: PrestamoNota[]
  loadingCuaderno: boolean
  loadingNotas: boolean
}

export const usePrestamosStore = defineStore('prestamos', {
  state: (): PrestamosState => ({
    cuaderno: [],
    notas: [],
    loadingCuaderno: false,
    loadingNotas: false,
  }),

  getters: {
    cuadernoPrestados: (state) => state.cuaderno.filter((p) => !p.devuelto),
    notasPrestadas: (state) => state.notas.filter((n) => n.estadoPrestamo === 'ENTREGADO'),
  },

  actions: {
    async fetchCuaderno() {
      this.loadingCuaderno = true
      try {
        const res = await prestamosService.listCuaderno()
        this.cuaderno = res.data
      } finally {
        this.loadingCuaderno = false
      }
    },

    async fetchNotas() {
      this.loadingNotas = true
      try {
        const res = await prestamosService.listNotas()
        this.notas = res.data
      } finally {
        this.loadingNotas = false
      }
    },

    async devolverCuaderno(id: string) {
      const updated = await prestamosService.devolverCuaderno(id)
      const idx = this.cuaderno.findIndex((p) => p.id === id)
      if (idx !== -1) this.cuaderno[idx] = updated
    },

    async devolverNota(id: string) {
      const updated = await prestamosService.devolverNota(id)
      const idx = this.notas.findIndex((n) => n.id === id)
      if (idx !== -1) this.notas[idx] = updated
    },
  },
})
