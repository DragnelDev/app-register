import { defineStore } from 'pinia'
import { resumenService } from '@/services/resumen.service'
import type { ResumenSistema } from '@/types/resumen.types'

interface ResumenState {
  data: ResumenSistema | null
  loading: boolean
}

export const useResumenStore = defineStore('resumen', {
  state: (): ResumenState => ({ data: null, loading: false }),

  getters: {
    /** Insignia de "Vínculos / Regularización" (0 = no se muestra). */
    pendientesRegularizar: (state) => state.data?.regularizacion.total ?? 0,
    depositos: (state) => state.data?.archivo.depositos ?? 0,
  },

  actions: {
    /** Refresca los contadores. Un fallo no debe romper la navegación: se conserva el último valor. */
    async fetch() {
      this.loading = true
      try {
        this.data = await resumenService.obtener()
      } catch {
        /* sin conexión o sin sesión: el menú simplemente no muestra insignias */
      } finally {
        this.loading = false
      }
    },

    reset() {
      this.data = null
    },
  },
})
