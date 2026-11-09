import apiClient from './api.client'
import type { PaginatedResponse, QueryParams } from '@/types/common.types'
import type {
  CuadernoFilterState,
  PrestamoCuaderno,
  PrestamoCuadernoCreatePayload,
  DevolverPrestamoCuadernoPayload,
  PrestamoNota,
  PrestamoNotaCreatePayload,
  PrestamoNotaUpdatePayload,
  DevolverPrestamoNotaPayload,
} from '@/types/prestamos.types'

/** Quita los filtros vacíos para no enviar "gestion=" ni "devuelto=" al backend. */
function paramsCuaderno(f: Partial<CuadernoFilterState>) {
  const p: Record<string, unknown> = {
    gestion: f.gestion || undefined,
    fechaDesde: f.fechaDesde || undefined,
    fechaHasta: f.fechaHasta || undefined,
    funcionarioId: f.funcionarioId || undefined,
    unidad: f.unidad?.trim() || undefined,
    estado: f.estado || undefined,
  }
  return Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined))
}

/**
 * Abre un PDF autenticado en una pestaña nueva. La pestaña se abre antes de
 * pedir el PDF para que el navegador no la bloquee como ventana emergente.
 */
async function abrirPdf(url: string, params: Record<string, unknown>) {
  const ventana = window.open('', '_blank')
  try {
    const response = await apiClient.get(url, { params, responseType: 'blob' })
    const objeto = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
    if (ventana) ventana.location.href = objeto
    else window.location.href = objeto
    setTimeout(() => URL.revokeObjectURL(objeto), 60_000)
  } catch (err) {
    ventana?.close()
    throw err
  }
}

export const prestamosService = {
  // --- Modo Cuaderno Bitácora (préstamo rápido, individual) ---
  listCuaderno(params: QueryParams = {}, filtros: Partial<CuadernoFilterState> = {}) {
    return apiClient
      .get<PaginatedResponse<PrestamoCuaderno>>('/prestamos-cuaderno', {
        params: { ...params, ...paramsCuaderno(filtros) },
      })
      .then((r) => r.data)
  },

  createCuaderno(payload: PrestamoCuadernoCreatePayload) {
    return apiClient.post<PrestamoCuaderno[]>('/prestamos-cuaderno', payload).then((r) => r.data)
  },

  devolverCuaderno(id: string, payload: DevolverPrestamoCuadernoPayload = {}) {
    return apiClient
      .patch<PrestamoCuaderno>(`/prestamos-cuaderno/${id}/devolver`, payload)
      .then((r) => r.data)
  },

  /** Sube o reemplaza la imagen de evidencia del lote (salida o devolución). */
  subirEvidenciaCuaderno(id: string | number, momento: 'salida' | 'devolucion', archivo: File) {
    const fd = new FormData()
    fd.append('file', archivo)
    return apiClient.post(`/prestamos-cuaderno/${id}/evidencia/${momento}`, fd).then((r) => r.data)
  },
  /** Descarga la imagen (autenticada) como URL temporal para mostrarla. */
  async urlEvidenciaCuaderno(id: string | number, momento: 'salida' | 'devolucion') {
    const r = await apiClient.get(`/prestamos-cuaderno/${id}/evidencia/${momento}`, {
      responseType: 'blob',
    })
    return URL.createObjectURL(r.data as Blob)
  },

  /** Planilla PDF de préstamos por cuaderno con los mismos filtros del listado. */
  abrirReporteCuadernoPdf(filtros: Partial<CuadernoFilterState>) {
    return abrirPdf('/prestamos-cuaderno/reporte/pdf', paramsCuaderno(filtros))
  },

  // --- Modo Nota/Oficio Oficial (un préstamo por cada comprobante solicitado) ---
  listNotas(params: QueryParams = {}) {
    return apiClient
      .get<PaginatedResponse<PrestamoNota>>('/prestamos-nota', { params })
      .then((r) => r.data)
  },

  /** Crea un préstamo por cada comprobante de la nota (borrador salvo `aprobar: true`). */
  createNota(payload: PrestamoNotaCreatePayload) {
    return apiClient.post<PrestamoNota[]>('/prestamos-nota', payload).then((r) => r.data)
  },

  /** Edita la nota completa mientras está en borrador (el N° viaja como query: puede llevar "/"). */
  updateNota(numeroNota: string, payload: PrestamoNotaUpdatePayload) {
    return apiClient
      .patch<PrestamoNota[]>('/prestamos-nota/nota', payload, { params: { numeroNota } })
      .then((r) => r.data)
  },

  /** Aprueba la nota: los comprobantes salen del archivo. */
  aprobarNota(numeroNota: string) {
    return apiClient
      .post<PrestamoNota[]>('/prestamos-nota/nota/aprobar', null, { params: { numeroNota } })
      .then((r) => r.data)
  },

  /** Descarta una nota que sigue en borrador. */
  descartarBorrador(numeroNota: string) {
    return apiClient.delete('/prestamos-nota/nota', { params: { numeroNota } }).then((r) => r.data)
  },

  /** Devuelve todos los comprobantes que salieron juntos (todo o nada). */
  devolverLoteCuaderno(loteId: string, payload: DevolverPrestamoCuadernoPayload = {}) {
    return apiClient
      .patch<PrestamoCuaderno[]>(`/prestamos-cuaderno/lote/${loteId}/devolver`, payload)
      .then((r) => r.data)
  },

  /** Devuelve la nota completa. El N° puede llevar "/", por eso va como query param. */
  devolverNotaCompleta(numeroNota: string, payload: DevolverPrestamoNotaPayload = {}) {
    return apiClient
      .patch<PrestamoNota[]>('/prestamos-nota/nota/devolver', payload, { params: { numeroNota } })
      .then((r) => r.data)
  },

  devolverNota(id: string, payload: DevolverPrestamoNotaPayload = {}) {
    return apiClient
      .patch<PrestamoNota>(`/prestamos-nota/${id}/devolver`, payload)
      .then((r) => r.data)
  },

  /** Abre el PDF de la nota de remisión (también sirve de vista previa del borrador). */
  abrirNotaPdf(numeroNota: string) {
    return abrirPdf('/prestamos-nota/pdf', { numeroNota })
  },
}
