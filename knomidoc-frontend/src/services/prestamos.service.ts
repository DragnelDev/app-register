import apiClient from './api.client'
import type { PaginatedResponse, QueryParams } from '@/types/common.types'
import type {
  PrestamoCuaderno,
  PrestamoCuadernoCreatePayload,
  PrestamoNota,
  PrestamoNotaCreatePayload,
} from '@/types/prestamos.types'

export const prestamosService = {
  // --- Modo Cuaderno Bitácora ---
  listCuaderno(params: QueryParams = {}) {
    return apiClient
      .get<PaginatedResponse<PrestamoCuaderno>>('/prestamos-cuaderno', { params })
      .then((r) => r.data)
  },

  createCuaderno(payload: PrestamoCuadernoCreatePayload) {
    return apiClient.post<PrestamoCuaderno>('/prestamos-cuaderno', payload).then((r) => r.data)
  },

  devolverCuaderno(id: string) {
    return apiClient
      .patch<PrestamoCuaderno>(`/prestamos-cuaderno/${id}/devolver`)
      .then((r) => r.data)
  },

  // --- Modo Nota/Oficio Oficial (lote) ---
  listNotas(params: QueryParams = {}) {
    return apiClient
      .get<PaginatedResponse<PrestamoNota>>('/prestamos-nota', { params })
      .then((r) => r.data)
  },

  createNota(payload: PrestamoNotaCreatePayload) {
    return apiClient.post<PrestamoNota>('/prestamos-nota', payload).then((r) => r.data)
  },

  devolverItemNota(prestamoNotaId: string, detalleId: string) {
    return apiClient
      .patch<PrestamoNota>(`/prestamos-nota/${prestamoNotaId}/detalle/${detalleId}/devolver`)
      .then((r) => r.data)
  },
}
