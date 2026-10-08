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
  fechaCreacion?: string
}

export interface CarpetaCreatePayload {
  codigoCarpeta: string
  ubicacionFisica: string
  estadoFisico?: 'EN_ARCHIVO' | 'PRESTADO'
}

export type CarpetaUpdatePayload = Partial<CarpetaCreatePayload>

export interface ComprobanteC31 {
  id: string
  actaEntregaId?: string | null
  tipoC31: TipoC31
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

  // Relación 1 a 1 estricta según tipoC31: solo una de las dos existe.
  preventivo?: C31Preventivo | null
  devengado?: C31Devengado | null
  beneficiarios: C31Beneficiario[]
  cheques: C31Cheque[]
}

/** Identificador oficial del comprobante: numeroPreventivo o numeroDevengado según corresponda. */
export function identificadorC31(c: {
  preventivo?: C31Preventivo | null
  devengado?: C31Devengado | null
}): string | undefined {
  return c.preventivo?.numeroPreventivo ?? c.devengado?.numeroDevengado ?? undefined
}

/** Payload plano para el formulario dinámico (arrays de strings, se transforman antes de enviar) */
export interface ComprobanteC31FormPayload {
  actaEntregaId?: string | null
  tipoC31?: TipoC31
  montoTotal: number
  fechaElaboracion: string
  descripcion: string
  numeroFolio?: string | null
  gestion?: number
  estadoFisico?: EstadoFisico
  ubicacionFisica?: string | null
  observaciones?: string | null
  // Relación 1 a 1 estricta: solo se envía uno de los dos según tipoC31.
  // Soporta "2 en 1" como texto libre dentro del mismo campo (ej. "0012 / 0013").
  numeroPreventivo?: string
  numeroDevengado?: string
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
