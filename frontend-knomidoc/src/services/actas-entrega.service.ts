import apiClient from './api.client'
import type { ComprobanteC31 } from '@/types/c31.types'
import type { PaginatedResponse, QueryParams } from '@/types/common.types'
import type {
  ActaAprobarPayload,
  ActaEntrega,
  ActaEntregaCreatePayload,
  ActaEntregaUpdatePayload,
} from '@/types/actas-entrega.types'

const RESOURCE = '/actas-entrega'

export const actasEntregaService = {
  list(params: QueryParams = {}) {
    return apiClient.get<PaginatedResponse<ActaEntrega>>(RESOURCE, { params }).then((r) => r.data)
  },

  /** Comprobantes firmados y sin acta (también para el remitente). */
  candidatos(search?: string) {
    return apiClient
      .get<ComprobanteC31[]>(`${RESOURCE}/candidatos`, { params: { search } })
      .then((r) => r.data)
  },

  /** Acta imprimible (firmas de quien entrega y de Archivo), en pestaña nueva. */
  async abrirPdf(id: string) {
    const ventana = window.open('', '_blank')
    try {
      const r = await apiClient.get(`${RESOURCE}/${id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
      if (ventana) ventana.location.href = url
      else window.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      ventana?.close()
      throw err
    }
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

  /** El archivista aprueba la recepción: recibidos pasan a "En archivo", observados vuelven. */
  aprobar(id: string, payload: ActaAprobarPayload) {
    return apiClient.patch<ActaEntrega>(`${RESOURCE}/${id}/aprobar`, payload).then((r) => r.data)
  },

  anular(id: string) {
    return apiClient.patch<ActaEntrega>(`${RESOURCE}/${id}/anular`).then((r) => r.data)
  },

  agregarComprobantes(id: string, comprobanteIds: number[]) {
    return apiClient
      .post<ActaEntrega>(`${RESOURCE}/${id}/comprobantes`, { comprobanteIds })
      .then((r) => r.data)
  },
}
