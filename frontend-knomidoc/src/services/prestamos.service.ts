import apiClient from './api.client'
import type { PaginatedResponse, QueryParams } from '@/types/common.types'
import type {
  PrestamoCuaderno,
  PrestamoCuadernoCreatePayload,
  DevolverPrestamoCuadernoPayload,
  PrestamoNota,
  PrestamoNotaCreatePayload,
  DevolverPrestamoNotaPayload,
} from '@/types/prestamos.types'

export const prestamosService = {
  // --- Modo Cuaderno Bitácora (préstamo rápido, individual) ---
  listCuaderno(params: QueryParams = {}) {
    return apiClient
      .get<PaginatedResponse<PrestamoCuaderno>>('/prestamos-cuaderno', { params })
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

  // --- Modo Nota/Oficio Oficial (un préstamo por cada comprobante solicitado) ---
  listNotas(params: QueryParams = {}) {
    return apiClient
      .get<PaginatedResponse<PrestamoNota>>('/prestamos-nota', { params })
      .then((r) => r.data)
  },

  /** Crea un préstamo por cada comprobante indicado en la nota; retorna todos los registros creados. */
  createNota(payload: PrestamoNotaCreatePayload) {
    return apiClient.post<PrestamoNota[]>('/prestamos-nota', payload).then((r) => r.data)
  },

  devolverNota(id: string, payload: DevolverPrestamoNotaPayload = {}) {
    return apiClient
      .patch<PrestamoNota>(`/prestamos-nota/${id}/devolver`, payload)
      .then((r) => r.data)
  },

  /**
   * Abre el PDF de la nota de remisión (carta) en una pestaña nueva, lista para
   * imprimir. La pestaña se abre antes de pedir el PDF para que el navegador no
   * la bloquee como ventana emergente.
   */
  async abrirNotaPdf(numeroNota: string) {
    const ventana = window.open('', '_blank')
    try {
      const response = await apiClient.get('/prestamos-nota/pdf', {
        params: { numeroNota },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      if (ventana) ventana.location.href = url
      else window.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      ventana?.close()
      throw err
    }
  },
}
