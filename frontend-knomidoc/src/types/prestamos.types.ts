import type { EstadoPrestamo } from './common.types'

/** Modo Cuaderno Bitácora: préstamo individual y rápido por gestión */
export interface PrestamoCuaderno {
  id: string
  comprobanteId: string
  gestion: number // año, ej. 2026
  quienRemite: string
  aQuienSePresta: string
  fechaEntrega: string
  estadoPrestamo: EstadoPrestamo
}

export type PrestamoCuadernoCreatePayload = Omit<
  PrestamoCuaderno,
  'id' | 'fechaEntrega' | 'estadoPrestamo'
>

/** Modo Nota/Oficio Oficial: préstamo en lote de comprobantes y/o carpetas completas */
export interface PrestamoNota {
  id: string
  numeroNotaSolicitud: string
  unidadSolicitante: string
  aQuienSePresta: string
  estadoPrestamo: EstadoPrestamo
  detalles: PrestamoNotaDetalle[]
}

export interface PrestamoNotaDetalle {
  id: string
  prestamoNotaId: string
  comprobanteId?: string | null
  carpetaId?: string | null
  estadoItem: EstadoPrestamo
}

export interface PrestamoNotaCreatePayload {
  numeroNotaSolicitud: string
  unidadSolicitante: string
  aQuienSePresta: string
  items: { comprobanteId?: string; carpetaId?: string }[]
}
