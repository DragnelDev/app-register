import type { EstadoPrestamoNota, MetodoVerificacion } from './common.types'
import type { ComprobanteC31 } from './c31.types'
import type { UsuarioSolicitante } from './auth.types'
import type { Funcionario } from './funcionarios.types'

/** Préstamo rápido registrado en el cuaderno de control de salida. */
export interface PrestamoCuaderno {
  id: string
  comprobanteId: string
  funcionarioId?: number | null
  areaUnidad: string
  fechaHoraSalida: string
  fechaDevolucionEstimada?: string | null
  fechaHoraDevolucion?: string | null
  devuelto: boolean
  condicionDevolucion?: CondicionDevolucion | null
  metodoVerificacion: MetodoVerificacion
  evidenciaVerificacionUrl?: string | null
  observaciones?: string | null
  comprobante?: ComprobanteC31
  funcionario?: Funcionario | null
  /** Solo registros anteriores al directorio de funcionarios. */
  solicitanteId?: string | null
  solicitante?: UsuarioSolicitante | null
}

export interface PrestamoCuadernoCreatePayload {
  comprobanteIds: number[]
  funcionarioId: number
  areaUnidad?: string
  fechaHoraSalida?: string
  fechaDevolucionEstimada?: string
  metodoVerificacion?: MetodoVerificacion
  evidenciaVerificacionUrl?: string
  observaciones?: string
}

/** Filtros del listado y del reporte PDF del cuaderno. */
export interface CuadernoFilterState {
  /** Gestión (año fiscal) del comprobante prestado */
  gestion: number | ''
  fechaDesde: string
  fechaHasta: string
  funcionarioId: number | null
  unidad: string
  /** '' = todos · 'false' = pendientes · 'true' = devueltos */
  devuelto: '' | 'true' | 'false'
}

export type CondicionDevolucion = 'CONFORME' | 'CON_NOVEDAD'

export interface DevolverPrestamoCuadernoPayload {
  fechaHoraDevolucion?: string
  observaciones?: string
  condicion?: CondicionDevolucion
}

/** Préstamo formal por nota de solicitud (ej. Auditoría Interna); una fila por comprobante prestado. */
export interface PrestamoNota {
  id: string
  comprobanteId: string
  numeroNotaSolicitud: string
  funcionarioId?: number | null
  funcionario?: Funcionario | null
  /** Copia de la unidad y del nombre al momento de la nota. */
  institucionSolicitante?: string | null
  funcionarioResponsable?: string | null
  referencia?: string | null
  destinatario?: string | null
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
  funcionarioId: number
  institucionSolicitante?: string
  referencia?: string
  destinatario?: string
  fechaPrestamo?: string
  fechaDevolucionEstimada?: string
  observaciones?: string
  /** false/omitido = queda en BORRADOR (editable); true = se entrega de inmediato */
  aprobar?: boolean
}

/** Campos editables de una nota mientras está en borrador. */
export type PrestamoNotaUpdatePayload = Partial<
  Omit<PrestamoNotaCreatePayload, 'comprobanteIds' | 'aprobar'>
>

export interface DevolverPrestamoNotaPayload {
  fechaDevolucionReal?: string
  observaciones?: string
  condicion?: CondicionDevolucion
}
