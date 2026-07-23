import apiClient from './api.client'
import type { PaginatedResponse, QueryParams } from '@/types/common.types'
import type {
  Carpeta,
  ComprobanteC31,
  ComprobanteC31FormPayload,
  C31FilterState,
} from '@/types/c31.types'

const RESOURCE = '/comprobantes-c31'

export const c31Service = {
  list(params: QueryParams & C31FilterState = {}) {
    return apiClient
      .get<PaginatedResponse<ComprobanteC31>>(RESOURCE, { params })
      .then((r) => r.data)
  },

  getById(id: string) {
    return apiClient.get<ComprobanteC31>(`${RESOURCE}/${id}`).then((r) => r.data)
  },

  create(payload: ComprobanteC31FormPayload) {
    return apiClient.post<ComprobanteC31>(RESOURCE, payload).then((r) => r.data)
  },

  update(id: string, payload: Partial<ComprobanteC31FormPayload>) {
    return apiClient.patch<ComprobanteC31>(`${RESOURCE}/${id}`, payload).then((r) => r.data)
  },

  softDelete(id: string) {
    return apiClient.delete<void>(`${RESOURCE}/${id}`).then((r) => r.data)
  },

  aprobar(id: string) {
    return apiClient.patch<ComprobanteC31>(`${RESOURCE}/${id}/aprobar`).then((r) => r.data)
  },

  rechazar(id: string, motivo: string) {
    return apiClient
      .patch<ComprobanteC31>(`${RESOURCE}/${id}/rechazar`, { motivo })
      .then((r) => r.data)
  },

  listCarpetas(params: QueryParams = {}) {
    return apiClient.get<PaginatedResponse<Carpeta>>('/carpetas', { params }).then((r) => r.data)
  },
}
