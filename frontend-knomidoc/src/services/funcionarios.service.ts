import apiClient from './api.client'
import type { PaginatedResponse, QueryParams } from '@/types/common.types'
import type { Funcionario, FuncionarioPayload } from '@/types/funcionarios.types'

const RESOURCE = '/funcionarios'

export const funcionariosService = {
  /** ?search= busca por CI, nombres, apellidos o unidad. */
  list(
    params: QueryParams & {
      estado?: string
      unidad?: string
      cargo?: string
      conHuella?: string
      conPrestamosActivos?: string
    } = {},
  ) {
    return apiClient.get<PaginatedResponse<Funcionario>>(RESOURCE, { params }).then((r) => r.data)
  },

  unidades() {
    return apiClient.get<string[]>(`${RESOURCE}/unidades`).then((r) => r.data)
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

  registrarHuella(id: number, plantilla: string, lector: string) {
    return apiClient
      .put<Funcionario>(`${RESOURCE}/${id}/huella`, { plantilla, lector })
      .then((r) => r.data)
  },

  quitarHuella(id: number) {
    return apiClient.delete<Funcionario>(`${RESOURCE}/${id}/huella`).then((r) => r.data)
  },

  verificarHuella(id: number, plantilla: string) {
    return apiClient
      .post<{ coincide: boolean }>(`${RESOURCE}/${id}/huella/verificar`, { plantilla })
      .then((r) => r.data)
  },

  remove(id: number) {
    return apiClient.delete<Funcionario>(`${RESOURCE}/${id}`).then((r) => r.data)
  },
}
