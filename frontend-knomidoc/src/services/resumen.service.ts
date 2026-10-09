import apiClient from './api.client'
import type { ResumenSistema } from '@/types/resumen.types'

export const resumenService = {
  obtener() {
    return apiClient.get<ResumenSistema>('/resumen').then((r) => r.data)
  },
}
