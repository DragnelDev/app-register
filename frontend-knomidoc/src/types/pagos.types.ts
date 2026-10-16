import type { ComprobanteC31 } from './c31.types'

export type TipoPago = 'CHEQUE' | 'ELECTRONICO'
export type EstadoPago = 'PENDIENTE' | 'PAGADO' | 'ANULADO'

export interface Pago {
  id: number
  comprobanteId: number
  beneficiarioId: number
  tipoPago: TipoPago
  numeroDocumento?: string | null
  banco?: string | null
  /** Nulo solo en cheques migrados sin monto conocido. */
  monto: number | null
  fechaPago?: string | null
  estadoPago: EstadoPago
  observaciones?: string | null
  beneficiario?: { id: number; nombreBeneficiario: string }
  comprobante?: ComprobanteC31
}

export interface PagoPayload {
  comprobanteId?: number
  beneficiarioId: number
  tipoPago: TipoPago
  numeroDocumento?: string
  banco?: string
  monto: number
  fechaPago?: string
  estadoPago?: EstadoPago
  observaciones?: string
}

export interface PagoFiltros {
  search?: string
  tipoPago?: TipoPago | ''
  estadoPago?: EstadoPago | ''
  gestion?: number | ''
  fechaDesde?: string
  fechaHasta?: string
  beneficiario?: string
  comprobanteId?: number
}

export interface PagosResumen {
  pagado: { cantidad: number; monto: number }
  pendiente: { cantidad: number; monto: number }
  anulado: { cantidad: number; monto: number }
  porTipo: { tipo: TipoPago; cantidad: number; monto: number }[]
}

export interface PagoPorBeneficiario {
  nombre: string
  cantidadPagos: number
  cantidadComprobantes: number
  montoPagado: number
  montoPendiente: number
  ultimoPago: string | null
}

export interface PagosDeComprobante {
  comprobanteId: number
  estadoFisico: string
  resumen: { montoTotal: number; pagado: number; pendiente: number; sinAsignar: number }
  beneficiarios: {
    id: number
    nombreBeneficiario: string
    totalPagado: number
    totalPendiente: number
    pagos: Pago[]
  }[]
}
