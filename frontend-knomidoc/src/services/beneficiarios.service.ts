import apiClient from './api.client'
import type { PaginatedResponse, QueryParams } from '@/types/common.types'
import type {
  Beneficiario,
  BeneficiarioFicha,
  BeneficiarioFiltros,
  BeneficiarioPayload,
} from '@/types/beneficiarios.types'

const RESOURCE = '/beneficiarios'

export const beneficiariosService = {
  list(params: QueryParams & BeneficiarioFiltros = {}) {
    return apiClient.get<PaginatedResponse<Beneficiario>>(RESOURCE, { params }).then((r) => r.data)
  },
  ficha(id: number) {
    return apiClient.get<BeneficiarioFicha>(`${RESOURCE}/${id}/ficha`).then((r) => r.data)
  },
  create(payload: BeneficiarioPayload) {
    return apiClient.post<Beneficiario>(RESOURCE, payload).then((r) => r.data)
  },
  update(id: number, payload: Partial<BeneficiarioPayload>) {
    return apiClient.patch<Beneficiario>(`${RESOURCE}/${id}`, payload).then((r) => r.data)
  },
  remove(id: number) {
    return apiClient.delete(`${RESOURCE}/${id}`).then((r) => r.data)
  },
  /** PDF del listado con los mismos filtros; se abre en una pestaña nueva. */
  async abrirPdf(params: BeneficiarioFiltros) {
    const ventana = window.open('', '_blank')
    try {
      const r = await apiClient.get(`${RESOURCE}/reporte/pdf`, { params, responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
      if (ventana) ventana.location.href = url
      else window.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      ventana?.close()
      throw err
    }
  },
}
