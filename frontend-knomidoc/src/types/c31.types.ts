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
  id?: number
  comprobanteId?: string
  nombreBeneficiario: string
}

export interface Carpeta {
  id: string | number
  codigoCarpeta: string
  ubicacionFisica?: string
  estadoFisico?: string
  estanteId?: number | null
  estante?: {
    id: number
    codigo: string
    deposito?: { id: number; codigo: string; nombre: string }
  } | null
  fechaCreacion?: string
}

export interface CarpetaCreatePayload {
  codigoCarpeta: string
  /** Referencia física libre; si se indica estanteId se antepone "DEPÓSITO / ESTANTE" automáticamente */
  ubicacionFisica?: string
  estanteId?: number | null
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

  // El backend devuelve listas; por la regla 1 a 1 según tipoC31 solo una de las dos trae un elemento.
  preventivos?: C31Preventivo[]
  devengados?: C31Devengado[]
  beneficiarios: C31Beneficiario[]
  actaEntrega?: { id: number; numeroActa: string; estado: string } | null
}

type ConIdentificadores = {
  preventivos?: C31Preventivo[] | null
  devengados?: C31Devengado[] | null
}

/** N° de preventivo del comprobante (si es CON_IMPUTACION). */
export function numeroPreventivoC31(c: ConIdentificadores): string | undefined {
  return c.preventivos?.[0]?.numeroPreventivo || undefined
}

/** N° de devengado del comprobante (si es SIN_IMPUTACION). */
export function numeroDevengadoC31(c: ConIdentificadores): string | undefined {
  return c.devengados?.[0]?.numeroDevengado || undefined
}

/** Identificador oficial del comprobante: numeroPreventivo o numeroDevengado según corresponda. */
export function identificadorC31(c: ConIdentificadores): string | undefined {
  return numeroPreventivoC31(c) ?? numeroDevengadoC31(c)
}

/**
 * Datos con los que nace un comprobante: tipo, N° de preventivo/devengado,
 * beneficiarios, glosa, monto total del documento y fecha. El resto (folio,
 * ubicación, pagos, estado) se completa después.
 */
export interface ComprobanteC31FormPayload {
  tipoC31?: TipoC31
  montoTotal: number
  fechaElaboracion: string
  descripcion: string
  numeroFolio?: string | null
  gestion?: number
  ubicacionFisica?: string | null
  observaciones?: string | null
  // Relación 1 a 1 estricta: solo se envía uno de los dos según tipoC31.
  numeroPreventivo?: string
  numeroDevengado?: string
  beneficiarios: string[]
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
  /** true = solo firmados (En revisión) que aún no van en un acta */
  sinActa?: boolean
  /** true = solo en archivo sin carpeta asignada */
  sinCarpeta?: boolean
}

/** Resultado de una importación masiva desde Excel */
export interface C31ImportResult {
  creados: number
  errores: { fila: number; motivo: string }[]
}

/** Un préstamo del comprobante, con todo el detalle de quién, cuándo y en qué condición. */
export interface C31PrestamoSeguimiento {
  tipo: 'CUADERNO' | 'NOTA'
  id: number
  referencia: string
  solicitante: string
  institucionOArea: string
  fechaSalida: string
  fechaDevolucionEstimada: string | null
  fechaDevolucion: string | null
  devuelto: boolean
  vencido: boolean
  diasPrestado: number
  diasVencido: number
  registradoPor: string | null
  recibidoPor: string | null
  metodoVerificacion: string | null
  evidenciaVerificacionUrl: string | null
  observaciones: string | null
  condicionDevolucion: 'CONFORME' | 'CON_NOVEDAD' | null
  observacionesDevolucion: string | null
}

export interface C31HistorialItem {
  id: number
  fecha: string
  estadoAnterior: string | null
  estadoNuevo: string
  origen: 'REGISTRO' | 'MANUAL' | 'ACTA' | 'PRESTAMO'
  referencia: string | null
  detalle: string | null
  usuario: string | null
}

export interface C31Seguimiento {
  comprobanteId: number
  estadoFisico: string
  acta: { id: number; numeroActa: string; estado: string } | null
  resumenPrestamos: { total: number; activos: number; vencidos: number; conNovedad: number }
  prestamos: C31PrestamoSeguimiento[]
  historial: C31HistorialItem[]
}
