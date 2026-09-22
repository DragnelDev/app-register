import apiClient from './api.client'
import type { PaginatedResponse, QueryParams } from '@/types/common.types'
import type {
  ComprobanteC31,
  ComprobanteC31FormPayload,
  C31FilterState,
  C31ImportResult,
} from '@/types/c31.types'

const RESOURCE = '/comprobantes-c31'

function cleanQueryParams(params: QueryParams & C31FilterState) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== '' && value !== undefined && value !== null,
    ),
  )
}

function normalizeComprobanteC31(payload: ComprobanteC31): ComprobanteC31 {
  return {
    ...payload,
    montoTotal: Number(payload.montoTotal),
    gestion: Number(payload.gestion),
    preventivos: payload.preventivos ?? [],
    devengados: payload.devengados ?? [],
    beneficiarios: payload.beneficiarios ?? [],
    cheques: payload.cheques ?? [],
  }
}

export const c31Service = {
  list(params: QueryParams & C31FilterState = {}) {
    return apiClient
      .get<PaginatedResponse<ComprobanteC31>>(RESOURCE, {
        params: cleanQueryParams(params),
      })
      .then((r) => ({
        ...r.data,
        data: r.data.data.map(normalizeComprobanteC31),
      }))
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

  /** Solo permite fijar EN_ARCHIVO o ANULADO (PRESTADO lo gestiona el módulo de préstamos). */
  cambiarEstadoFisico(id: string, estadoFisico: 'EN_ARCHIVO' | 'ANULADO') {
    return apiClient
      .patch<ComprobanteC31>(`${RESOURCE}/${id}`, { estadoFisico })
      .then((r) => r.data)
  },

  softDelete(id: string) {
    return apiClient.delete<void>(`${RESOURCE}/${id}`).then((r) => r.data)
  },

  /** Gestiones (años) con comprobantes registrados, para el selector de filtro */
  listGestiones() {
    return apiClient.get<number[]>(`${RESOURCE}/gestiones`).then((r) => r.data)
  },

  /** Descarga el Excel con el formato institucional (opcionalmente filtrado por gestión) */
  async exportExcel(gestion?: number | '') {
    const response = await apiClient.get(`${RESOURCE}/export`, {
      params: gestion ? { gestion } : {},
      responseType: 'blob',
    })
    const url = URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = `comprobantes-c31-gestion-${gestion || 'todas'}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },

  /** Carga masiva desde un Excel ya diligenciado con el formato institucional */
  importExcel(file: File, gestion: number) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('gestion', String(gestion))
    return apiClient
      .post<C31ImportResult>(`${RESOURCE}/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
}
