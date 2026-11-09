import apiClient from './api.client'
import type { PaginatedResponse, QueryParams } from '@/types/common.types'
import type {
  ComprobanteC31,
  ComprobanteC31FormPayload,
  C31FilterState,
  C31ImportResult,
  C31Seguimiento,
  C31GrupoMiembro,
  C31Adjunto,
  TipoAdjuntoC31,
} from '@/types/c31.types'
import type { EstadoFisico } from '@/types/common.types'

const RESOURCE = '/comprobantes-c31'

function cleanQueryParams(params: object) {
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

  /** Abre un PDF (autenticado) en otra pestaña */
  async abrirPdf(ruta: string, params: Record<string, unknown> = {}) {
    const ventana = window.open('', '_blank')
    try {
      const r = await apiClient.get(`${RESOURCE}/${ruta}`, {
        params: cleanQueryParams(params as QueryParams & C31FilterState),
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

  listadoPdf(filtros: C31FilterState) {
    return this.abrirPdf('pdf', filtros as unknown as Record<string, unknown>)
  },

  fichaPdf(id: string | number) {
    return this.abrirPdf(`${id}/pdf`)
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

  /** Cambio de estado manual; EN_ARCHIVO y PRESTADO los fija el sistema (acta / préstamos). */
  cambiarEstado(id: string, estado: EstadoFisico, motivo?: string) {
    return apiClient
      .patch<ComprobanteC31>(`${RESOURCE}/${id}/estado`, { estado, motivo })
      .then((r) => r.data)
  },

  /** Comprobantes unidos al indicado (incluido él). Vacío si no está unido. */
  grupo(id: string | number) {
    return apiClient.get<C31GrupoMiembro[]>(`${RESOURCE}/${id}/grupo`).then((r) => r.data)
  },

  /** Une comprobantes que vienen como uno solo; cada uno conserva su registro. */
  unir(comprobanteIds: (string | number)[]) {
    return apiClient
      .post<C31GrupoMiembro[]>(`${RESOURCE}/unir`, {
        comprobanteIds: comprobanteIds.map(Number),
      })
      .then((r) => r.data)
  },

  /** Saca el comprobante de su grupo. */
  separar(id: string | number) {
    return apiClient.delete(`${RESOURCE}/${id}/grupo`).then((r) => r.data)
  },

  /** Bitácora de estados y detalle de préstamos del comprobante. */
  seguimiento(id: string | number) {
    return apiClient.get<C31Seguimiento>(`${RESOURCE}/${id}/seguimiento`).then((r) => r.data)
  },

  /** Asigna una carpeta física (y la parte n de 5) a un comprobante. */
  asignarCarpeta(comprobanteId: string | number, carpetaId: string | number, numeroParte: number) {
    return apiClient
      .post('/c31-carpetas-ubicacion', {
        comprobanteId: Number(comprobanteId),
        carpetaId: Number(carpetaId),
        numeroParte,
      })
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
  async exportExcel(filtros: C31FilterState) {
    const gestion = filtros.gestion
    // Solo se envían los filtros con valor, igual que el listado en pantalla
    const params = cleanQueryParams(filtros)
    const response = await apiClient.get(`${RESOURCE}/export`, {
      params,
      responseType: 'blob',
    })
    const url = URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = `comprobantes-c31-gestion-${gestion || 'todas'}-filtrado.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },

  /** Carga masiva desde un Excel ya diligenciado con el formato institucional */
  importExcel(file: File, gestion: number, simular = false) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('gestion', String(gestion))
    // Sin Content-Type manual: el navegador agrega el boundary del multipart
    return apiClient
      .post<C31ImportResult>(`${RESOURCE}/import`, formData, {
        params: simular ? { simular: 1 } : {},
      })
      .then((r) => r.data)
  },

  // --- Digitalización: escaneos y respaldos (carpeta privada, solo con sesión) ---
  listAdjuntos(comprobanteId: number | string) {
    return apiClient.get<C31Adjunto[]>(`/uploads/c31/${comprobanteId}`).then((r) => r.data)
  },

  subirAdjunto(comprobanteId: number | string, file: File, tipo: TipoAdjuntoC31) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('tipo', tipo)
    return apiClient
      .post<C31Adjunto>(`/uploads/c31/${comprobanteId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120_000,
      })
      .then((r) => r.data)
  },

  /** Digitalización rápida: varias imágenes (en orden) → un PDF adjunto al comprobante */
  digitalizar(
    comprobanteId: number | string,
    imagenes: File[],
    tipo: TipoAdjuntoC31,
    onProgress?: (porcentaje: number) => void,
  ) {
    const formData = new FormData()
    imagenes.forEach((f) => formData.append('files', f))
    formData.append('tipo', tipo)
    return apiClient
      .post<{ ok: boolean; paginas: number; adjunto: C31Adjunto; url: string }>(
        `/uploads/c31/${comprobanteId}/digitalizar`,
        formData,
        {
          timeout: 300_000,
          onUploadProgress: (e) => {
            if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100))
          },
        },
      )
      .then((r) => r.data)
  },

  eliminarAdjunto(comprobanteId: number | string, adjuntoId: number) {
    return apiClient.delete(`/uploads/c31/${comprobanteId}/${adjuntoId}`).then((r) => r.data)
  },

  /** Descarga el archivo como blob (el endpoint exige JWT, no sirve un <a href> directo). */
  async obtenerAdjunto(comprobanteId: number | string, adjuntoId: number): Promise<Blob> {
    const response = await apiClient.get(`/uploads/c31/${comprobanteId}/${adjuntoId}/archivo`, {
      responseType: 'blob',
      timeout: 120_000,
    })
    return response.data as Blob
  },
}
