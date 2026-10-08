import apiClient from './api.client'
import type { PaginatedResponse, QueryParams } from '@/types/common.types'
import type { Carpeta, CarpetaCreatePayload, CarpetaUpdatePayload } from '@/types/c31.types'

const RESOURCE = '/carpetas'

export const carpetasService = {
  list(params: QueryParams = {}) {
    return apiClient.get<PaginatedResponse<Carpeta>>(RESOURCE, { params }).then((r) => r.data)
  },

  getById(id: string | number) {
    return apiClient.get<Carpeta>(`${RESOURCE}/${id}`).then((r) => r.data)
  },

  create(payload: CarpetaCreatePayload) {
    return apiClient.post<Carpeta>(RESOURCE, payload).then((r) => r.data)
  },

  update(id: string | number, payload: CarpetaUpdatePayload) {
    return apiClient.patch<Carpeta>(`${RESOURCE}/${id}`, payload).then((r) => r.data)
  },

  remove(id: string | number) {
    return apiClient.delete<void>(`${RESOURCE}/${id}`).then((r) => r.data)
  },
}
