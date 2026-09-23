import type { EstadoFisico, TipoC31 } from './common.types'

export interface C31Preventivo {
  id?: string
  comprobanteId?: string
  numeroPreventivo: string
}

export interface C31Devengado {
  id?: string
  comprobanteId?: string
  numeroDevengado: string
}

export interface C31Beneficiario {
  id?: string
  comprobanteId?: string
  nombreBeneficiario: string
}

export interface C31Cheque {
  id?: string
  comprobanteId?: string
  numeroCheque: string
}

export interface Carpeta {
  id: string | number
  codigoCarpeta: string
  ubicacionFisica?: string
  estadoFisico?: string
}

export interface ComprobanteC31 {
  id: string
  actaEntregaId?: string | null
  tipoC31: TipoC31
  numeroComprobante?: string | null
  montoTotal: number
  fechaElaboracion: string
  descripcion: string
  numeroFolio?: string | null
  gestion: number
  estadoFisico: EstadoFisico
  ubicacionFisica?: string | null
  observaciones?: string | null
  creadoPorId?: string | null
  fechaCreacion?: string
  fechaModificacion?: string

  // Relaciones 0..N cargadas junto con el comprobante
  preventivos: C31Preventivo[]
  devengados: C31Devengado[]
  beneficiarios: C31Beneficiario[]
  cheques: C31Cheque[]
}

/** Payload plano para el formulario dinámico (arrays de strings, se transforman antes de enviar) */
export interface ComprobanteC31FormPayload {
  actaEntregaId?: string | null
  tipoC31?: TipoC31
  numeroComprobante?: string | null
  montoTotal: number
  fechaElaboracion: string
  descripcion: string
  numeroFolio?: string | null
  gestion?: number
  estadoFisico?: EstadoFisico
  ubicacionFisica?: string | null
  observaciones?: string | null
  preventivos: string[] // soporta "2 en 1"
  devengados: string[] // soporta "2 en 1"
  beneficiarios: string[]
  cheques: string[] // opcional, puede ir vacío
  carpetas?: { carpetaId: string | number; numeroParte: number }[]
}

export interface C31FilterState {
  search?: string
  estadoFisico?: EstadoFisico | ''
  tipoC31?: TipoC31 | ''
  fechaDesde?: string
  fechaHasta?: string
  gestion?: number | ''
  actaEntregaId?: string | ''
}

/** Resultado de una importación masiva desde Excel */
export interface C31ImportResult {
  creados: number
  errores: { fila: number; motivo: string }[]
}
