import type { EstadoPrestamoNota, MetodoVerificacion } from './common.types'
import type { ComprobanteC31 } from './c31.types'
import type { UsuarioSolicitante } from './auth.types'

/** Préstamo rápido registrado en el cuaderno de control de salida. */
export interface PrestamoCuaderno {
  id: string
  comprobanteId: string
  solicitanteId: string
  areaUnidad: string
  fechaHoraSalida: string
  fechaHoraDevolucion?: string | null
  devuelto: boolean
  metodoVerificacion: MetodoVerificacion
  evidenciaVerificacionUrl?: string | null
  observaciones?: string | null
  comprobante?: ComprobanteC31
  solicitante?: UsuarioSolicitante
}

export interface PrestamoCuadernoCreatePayload {
  comprobanteId: string
  solicitanteId: string
  areaUnidad?: string
  fechaHoraSalida?: string
  metodoVerificacion?: MetodoVerificacion
  evidenciaVerificacionUrl?: string
  observaciones?: string
}

export interface DevolverPrestamoCuadernoPayload {
  fechaHoraDevolucion?: string
  observaciones?: string
}

/** Préstamo formal por nota de solicitud (ej. Auditoría Interna); una fila por comprobante prestado. */
export interface PrestamoNota {
  id: string
  comprobanteId: string
  numeroNotaSolicitud: string
  institucionSolicitante: string
  funcionarioResponsable: string
  fechaPrestamo: string
  fechaDevolucionEstimada?: string | null
  fechaDevolucionReal?: string | null
  estadoPrestamo: EstadoPrestamoNota
  observaciones?: string | null
  comprobante?: ComprobanteC31
}

export interface PrestamoNotaCreatePayload {
  comprobanteIds: string[]
  numeroNotaSolicitud: string
  institucionSolicitante: string
  funcionarioResponsable: string
  fechaPrestamo?: string
  fechaDevolucionEstimada?: string
  observaciones?: string
}

export interface DevolverPrestamoNotaPayload {
  fechaDevolucionReal?: string
  observaciones?: string
}
