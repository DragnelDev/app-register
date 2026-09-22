import apiClient from './api.client'
import type { PaginatedResponse, QueryParams } from '@/types/common.types'
import type {
  Usuario,
  UsuarioSolicitante,
  UsuarioCreatePayload,
  UsuarioUpdatePayload,
} from '@/types/auth.types'

const RESOURCE = '/usuarios'

// Nota: el backend NestJS protege estos endpoints con un guard de rol (@Roles('ADMIN')).
// El frontend además oculta la ruta/menú a no-admins, pero la autorización real vive en el backend.
export const usuariosService = {
  list(params: QueryParams = {}) {
    return apiClient.get<PaginatedResponse<Usuario>>(RESOURCE, { params }).then((r) => r.data)
  },

  /** Listado liviano de usuarios activos para elegir el "solicitante" de un préstamo (cuaderno). */
  solicitantes(search?: string) {
    return apiClient
      .get<UsuarioSolicitante[]>(`${RESOURCE}/solicitantes`, { params: { search } })
      .then((r) => r.data)
  },

  create(payload: UsuarioCreatePayload) {
    return apiClient.post<Usuario>(RESOURCE, payload).then((r) => r.data)
  },

  update(id: string, payload: UsuarioUpdatePayload) {
    return apiClient.patch<Usuario>(`${RESOURCE}/${id}`, payload).then((r) => r.data)
  },

  toggleActivo(id: string, activo: boolean) {
    return apiClient.patch<Usuario>(`${RESOURCE}/${id}/estado`, { activo }).then((r) => r.data)
  },

  remove(id: string) {
    return apiClient.delete<void>(`${RESOURCE}/${id}`).then((r) => r.data)
  },
}
