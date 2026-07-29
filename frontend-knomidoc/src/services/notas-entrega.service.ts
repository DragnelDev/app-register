import apiClient from './api.client'
import type { PaginatedResponse, QueryParams } from '@/types/common.types'
import type {
  NotaEntrega,
  NotaEntregaCreatePayload,
  NotaEntregaUpdatePayload,
} from '@/types/notas-entrega.types'

const RESOURCE = '/actas-entrega'

export const notasEntregaService = {
  list(params: QueryParams = {}) {
    return apiClient.get<PaginatedResponse<NotaEntrega>>(RESOURCE, { params }).then((r) => r.data)
  },

  getById(id: string) {
    return apiClient.get<NotaEntrega>(`${RESOURCE}/${id}`).then((r) => r.data)
  },

  create(payload: NotaEntregaCreatePayload) {
    const formData = buildFormData(payload)
    return apiClient
      .post<NotaEntrega>(RESOURCE, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  update(id: string, payload: NotaEntregaUpdatePayload) {
    const formData = buildFormData(payload)
    return apiClient
      .patch<NotaEntrega>(`${RESOURCE}/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  remove(id: string) {
    return apiClient.delete<void>(`${RESOURCE}/${id}`).then((r) => r.data)
  },
}

function buildFormData(payload: Record<string, unknown>): FormData {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    formData.append(key, String(value))
  })
  return formData
}
