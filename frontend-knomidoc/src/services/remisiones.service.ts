import apiClient from './api.client'
import type { PaginatedResponse, QueryParams } from '@/types/common.types'

export interface RemisionItem {
  comprobanteId: number
  identificador: string
  montoTotal?: number | null
  descripcion?: string | null
  recibido: boolean | null
  observacion: string | null
}
export interface Remision {
  id: number
  numeroRemision: string
  gestion: number
  estado: 'BORRADOR' | 'ENVIADA' | 'RECIBIDA' | 'OBSERVADA'
  unidadRemitente?: string | null
  observacion?: string | null
  remitente?: string | null
  receptor?: string | null
  fechaEnvio?: string | null
  fechaRecepcion?: string | null
  observacionRecepcion?: string | null
  items: RemisionItem[]
}
export interface CandidatoRemision {
  id: number
  identificador: string
  gestion: number
  montoTotal?: number | null
  descripcion?: string | null
}

const R = '/remisiones'
export const remisionesService = {
  list: (params: QueryParams & { estado?: string } = {}) =>
    apiClient.get<PaginatedResponse<Remision>>(R, { params }).then((r) => r.data),
  candidatos: (search?: string) =>
    apiClient.get<CandidatoRemision[]>(`${R}/candidatos`, { params: { search } }).then((r) => r.data),
  crear: (p: { comprobanteIds: number[]; unidadRemitente?: string; observacion?: string; enviar?: boolean }) =>
    apiClient.post<Remision>(R, p).then((r) => r.data),
  enviar: (id: number) => apiClient.post<Remision>(`${R}/${id}/enviar`).then((r) => r.data),
  eliminar: (id: number) => apiClient.delete(`${R}/${id}`).then((r) => r.data),
  recibir: (
    id: number,
    p: { items: { comprobanteId: number; recibido: boolean; observacion?: string }[]; observacion?: string },
  ) => apiClient.post<Remision>(`${R}/${id}/recibir`, p).then((r) => r.data),
}
