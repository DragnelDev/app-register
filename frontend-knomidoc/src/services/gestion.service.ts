import apiClient from './api.client'
import type { PaginatedResponse, QueryParams } from '@/types/common.types'
import type {
  AuditoriaFiltros,
  AuditoriaLog,
  ParametroGestion,
  ParametroGestionPayload,
  ReporteFiltros,
  ReporteFinanciero,
} from '@/types/gestion.types'

function limpiar(params: object) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null),
  )
}

export const parametrosGestionService = {
  list() {
    return apiClient.get<ParametroGestion[]>('/parametros-gestion').then((r) => r.data)
  },
  activa() {
    return apiClient.get<ParametroGestion | null>('/parametros-gestion/activa').then((r) => r.data)
  },
  create(payload: ParametroGestionPayload) {
    return apiClient.post<ParametroGestion>('/parametros-gestion', payload).then((r) => r.data)
  },
  update(id: number, payload: Partial<Omit<ParametroGestionPayload, 'gestion'>>) {
    return apiClient
      .patch<ParametroGestion>(`/parametros-gestion/${id}`, payload)
      .then((r) => r.data)
  },
  accion(id: number, accion: 'activar' | 'cerrar' | 'reabrir') {
    return apiClient
      .patch<ParametroGestion>(`/parametros-gestion/${id}/${accion}`)
      .then((r) => r.data)
  },
  remove(id: number) {
    return apiClient.delete(`/parametros-gestion/${id}`).then((r) => r.data)
  },
}

export const auditoriaService = {
  list(params: QueryParams = {}) {
    return apiClient
      .get<PaginatedResponse<AuditoriaLog>>('/auditoria', { params: limpiar(params) })
      .then((r) => r.data)
  },
  filtros() {
    return apiClient.get<AuditoriaFiltros>('/auditoria/filtros').then((r) => r.data)
  },
}

export const reportesService = {
  financiero(filtros: ReporteFiltros) {
    return apiClient
      .get<ReporteFinanciero>('/reportes/financiero', { params: limpiar(filtros) })
      .then((r) => r.data)
  },
  async exportar(filtros: ReporteFiltros) {
    const res = await apiClient.get('/reportes/financiero/export', {
      params: limpiar(filtros),
      responseType: 'blob',
    })
    const url = URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-financiero-${filtros.gestion || 'todas'}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },
}
