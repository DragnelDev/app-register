import type { EstadoAprobacion, EstadoFisico } from './common.types'

export interface Carpeta {
  id: string
  codigoCarpeta: string
  ubicacionFisica: string
  estadoFisico: EstadoFisico
}

/** Relación N:M comprobantes_c31 <-> carpetas, con número de parte (1 de 5, 2 de 5...) */
export interface C31CarpetaUbicacion {
  comprobanteId: string
  carpetaId: string
  numeroParte: number
  carpeta?: Carpeta
}

export interface C31Preventivo {
  comprobanteId: string
  numeroPreventivo: string
}

export interface C31Devengado {
  comprobanteId: string
  numeroDevengado: string
}

export interface C31Beneficiario {
  comprobanteId: string
  nombreBeneficiario: string
}

export interface C31Cheque {
  comprobanteId: string
  numeroCheque: string
}

export interface ComprobanteC31 {
  id: string
  notaEntregaId?: string | null
  montoTotal: number
  fechaElaboracion: string
  descripcion: string
  numeroFolio?: number | null
  estaFoliado: boolean
  cantidadCarpetas: number // 1 a 5
  estadoAprobacion: EstadoAprobacion
  estadoFisico: EstadoFisico
  createdBy: string
  deletedAt?: string | null

  // Relaciones 0..N cargadas junto con el comprobante
  preventivos: C31Preventivo[]
  devengados: C31Devengado[]
  beneficiarios: C31Beneficiario[]
  cheques: C31Cheque[]
  carpetasUbicacion: C31CarpetaUbicacion[]
}

/** Payload plano para el formulario dinámico (arrays de strings, se transforman antes de enviar) */
export interface ComprobanteC31FormPayload {
  notaEntregaId?: string | null
  montoTotal: number
  fechaElaboracion: string
  descripcion: string
  numeroFolio?: number | null
  estaFoliado: boolean
  preventivos: string[] // soporta "2 en 1"
  devengados: string[] // soporta "2 en 1"
  beneficiarios: string[]
  cheques: string[] // opcional, puede ir vacío
  carpetas: { carpetaId: string; numeroParte: number }[] // hasta 5
}

export interface C31FilterState {
  search?: string
  estadoAprobacion?: EstadoAprobacion | ''
  estadoFisico?: EstadoFisico | ''
  fechaDesde?: string
  fechaHasta?: string
}
