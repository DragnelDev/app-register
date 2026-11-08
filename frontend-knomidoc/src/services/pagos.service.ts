import apiClient from './api.client'
import type { PaginatedResponse, QueryParams } from '@/types/common.types'
import type {
  Pago,
  PagoFiltros,
  PagoPayload,
  PagoPorBeneficiario,
  PagosDeComprobante,
  PagosResumen,
} from '@/types/pagos.types'

const RESOURCE = '/pagos'

const limpiar = (params: object) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null),
  )

export const pagosService = {
  list(params: QueryParams & PagoFiltros = {}) {
    return apiClient
      .get<PaginatedResponse<Pago>>(RESOURCE, { params: limpiar(params) })
      .then((r) => r.data)
  },
  resumen(params: PagoFiltros = {}) {
    return apiClient
      .get<PagosResumen>(`${RESOURCE}/resumen`, { params: limpiar(params) })
      .then((r) => r.data)
  },
  porBeneficiario(params: QueryParams & PagoFiltros = {}) {
    return apiClient
      .get<PaginatedResponse<PagoPorBeneficiario>>(`${RESOURCE}/beneficiarios`, {
        params: limpiar(params),
      })
      .then((r) => r.data)
  },
  porComprobante(comprobanteId: number | string) {
    return apiClient
      .get<PagosDeComprobante>(`${RESOURCE}/comprobante/${comprobanteId}`)
      .then((r) => r.data)
  },
  create(payload: PagoPayload) {
    return apiClient.post<Pago>(RESOURCE, payload).then((r) => r.data)
  },
  update(id: number, payload: Partial<PagoPayload>) {
    return apiClient.patch<Pago>(`${RESOURCE}/${id}`, payload).then((r) => r.data)
  },
  remove(id: number) {
    return apiClient.delete<Pago>(`${RESOURCE}/${id}`).then((r) => r.data)
  },
  /** Abre un PDF autenticado en otra pestaña (listado con filtros o constancia individual). */
  async abrirPdf(ruta: string, params: object = {}) {
    const ventana = window.open('', '_blank')
    try {
      const r = await apiClient.get(`${RESOURCE}/${ruta}`, {
        params: limpiar(params),
        responseType: 'blob',
      })
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
      if (ventana) ventana.location.href = url
      else window.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e) {
      ventana?.close()
      throw e
    }
  },
  listadoPdf(params: PagoFiltros = {}) {
    return this.abrirPdf('pdf', params)
  },
  constanciaPdf(id: number) {
    return this.abrirPdf(`${id}/pdf`)
  },
  async exportExcel(params: PagoFiltros = {}) {
    const response = await apiClient.get(`${RESOURCE}/export`, {
      params: limpiar(params),
      responseType: 'blob',
    })
    const url = URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = 'pagos-c31.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },
}
