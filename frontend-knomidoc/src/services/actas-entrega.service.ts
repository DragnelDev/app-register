import apiClient from './api.client'
import type { PaginatedResponse, QueryParams } from '@/types/common.types'
import type {
  ActaEntrega,
  ActaEntregaCreatePayload,
  ActaEntregaUpdatePayload,
} from '@/types/actas-entrega.types'

const RESOURCE = '/actas-entrega'

export const actasEntregaService = {
  list(params: QueryParams = {}) {
    return apiClient.get<PaginatedResponse<ActaEntrega>>(RESOURCE, { params }).then((r) => r.data)
  },

  getById(id: string) {
    return apiClient.get<ActaEntrega>(`${RESOURCE}/${id}`).then((r) => r.data)
  },

  create(payload: ActaEntregaCreatePayload) {
    return apiClient.post<ActaEntrega>(RESOURCE, payload).then((r) => r.data)
  },

  update(id: string, payload: ActaEntregaUpdatePayload) {
    return apiClient.patch<ActaEntrega>(`${RESOURCE}/${id}`, payload).then((r) => r.data)
  },

  remove(id: string) {
    return apiClient.delete<void>(`${RESOURCE}/${id}`).then((r) => r.data)
  },
}
