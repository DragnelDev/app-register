import apiClient from './api.client'
import type { PaginatedResponse, QueryParams } from '@/types/common.types'
import type { Funcionario, FuncionarioPayload } from '@/types/funcionarios.types'

const RESOURCE = '/funcionarios'

export const funcionariosService = {
  /** ?search= busca por CI, nombres, apellidos o unidad. */
  list(params: QueryParams & { estado?: string } = {}) {
    return apiClient
      .get<PaginatedResponse<Funcionario>>(RESOURCE, { params })
      .then((r) => r.data)
  },

  getById(id: number) {
    return apiClient.get<Funcionario>(`${RESOURCE}/${id}`).then((r) => r.data)
  },

  create(payload: FuncionarioPayload) {
    return apiClient.post<Funcionario>(RESOURCE, payload).then((r) => r.data)
  },

  update(id: number, payload: Partial<FuncionarioPayload>) {
    return apiClient.patch<Funcionario>(`${RESOURCE}/${id}`, payload).then((r) => r.data)
  },

  remove(id: number) {
    return apiClient.delete<Funcionario>(`${RESOURCE}/${id}`).then((r) => r.data)
  },
}
