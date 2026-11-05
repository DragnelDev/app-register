import apiClient from './api.client'
import type { PaginatedResponse, QueryParams } from '@/types/common.types'
import type { Deposito, DepositoPayload, Estante, EstantePayload } from '@/types/archivo.types'

export const depositosService = {
  list(params: QueryParams = {}) {
    return apiClient.get<PaginatedResponse<Deposito>>('/depositos', { params }).then((r) => r.data)
  },
  opciones() {
    return apiClient.get<Deposito[]>('/depositos/opciones').then((r) => r.data)
  },
  create(payload: DepositoPayload) {
    return apiClient.post<Deposito>('/depositos', payload).then((r) => r.data)
  },
  update(id: number, payload: Partial<DepositoPayload>) {
    return apiClient.patch<Deposito>(`/depositos/${id}`, payload).then((r) => r.data)
  },
  remove(id: number) {
    return apiClient.delete(`/depositos/${id}`).then((r) => r.data)
  },
}

export const estantesService = {
  list(params: QueryParams = {}) {
    return apiClient.get<PaginatedResponse<Estante>>('/estantes', { params }).then((r) => r.data)
  },
  opciones(depositoId?: number) {
    return apiClient
      .get<Estante[]>('/estantes/opciones', { params: depositoId ? { depositoId } : {} })
      .then((r) => r.data)
  },
  create(payload: EstantePayload) {
    return apiClient.post<Estante>('/estantes', payload).then((r) => r.data)
  },
  update(id: number, payload: Partial<EstantePayload>) {
    return apiClient.patch<Estante>(`/estantes/${id}`, payload).then((r) => r.data)
  },
  remove(id: number) {
    return apiClient.delete(`/estantes/${id}`).then((r) => r.data)
  },
}
