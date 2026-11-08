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
  montoTotal: number | null
  fechaElaboracion: string | null
  descripcion: string | null
  numeroFolio?: string | null
  gestion: number
  estadoFisico: EstadoFisico
  ubicacionFisica?: string | null
  observaciones?: string | null
  /** PDF escaneado principal; nulo = pendiente de digitalizar */
  archivoAdjuntoUrl?: string | null
  fechaDigitalizacion?: string | null
  creadoPorId?: string | null
  fechaCreacion?: string
  fechaModificacion?: string

  /** Mismo valor en los comprobantes unidos (PREV + PREV, PREV + DEV). */
  grupoUnionId?: string | null
  preventivos?: C31Preventivo[]
  devengados?: C31Devengado[]
  beneficiarios: C31Beneficiario[]
  actaEntrega?: { id: number; numeroActa: string; estado: string } | null
}

type ConIdentificadores = {
  preventivos?: C31Preventivo[] | null
  devengados?: C31Devengado[] | null
}

/** Todos los N° de preventivo del comprobante (puede haber varios unidos). */
export function preventivosC31(c: ConIdentificadores): string[] {
  return (c.preventivos ?? []).map((p) => p.numeroPreventivo?.trim()).filter(Boolean) as string[]
}

/** Todos los N° de devengado del comprobante. */
export function devengadosC31(c: ConIdentificadores): string[] {
  return (c.devengados ?? []).map((d) => d.numeroDevengado?.trim()).filter(Boolean) as string[]
}

/** "3 / 7" o undefined. */
export function numeroPreventivoC31(c: ConIdentificadores): string | undefined {
  return preventivosC31(c).join(' / ') || undefined
}

/** "45" o "45 / 46", o undefined. */
export function numeroDevengadoC31(c: ConIdentificadores): string | undefined {
  return devengadosC31(c).join(' / ') || undefined
}

/** Identificador del comprobante: "3 / 7", "45", o "12 · Dev. 45" si vienen juntos. */
export function identificadorC31(c: ConIdentificadores): string | undefined {
  const prev = numeroPreventivoC31(c)
  const dev = numeroDevengadoC31(c)
  if (prev && dev) return `${prev} · Dev. ${dev}`
  return prev ?? dev
}

/**
 * Identificador rotulado para mostrar: PREV y DEV tienen numeración propia
 * (PREV 1 ≠ DEV 1). Ej.: "PREV 3", "DEV 45", "PREV 12 · DEV 45".
 */
export function rotuloC31(c: ConIdentificadores): string | undefined {
  const prev = numeroPreventivoC31(c)
  const dev = numeroDevengadoC31(c)
  const partes = [prev && `PREV ${prev}`, dev && `DEV ${dev}`].filter(Boolean)
  return partes.join(' · ') || undefined
}

/**
 * Datos con los que nace un comprobante: tipo, N° de preventivo/devengado,
 * beneficiarios, glosa, monto total del documento y fecha. El resto (folio,
 * ubicación, pagos, estado) se completa después.
 */
export interface ComprobanteC31FormPayload {
  tipoC31?: TipoC31
  montoTotal?: number
  fechaElaboracion?: string
  descripcion?: string
  numeroFolio?: string | null
  gestion?: number
  ubicacionFisica?: string | null
  observaciones?: string | null
  // Un solo identificador por comprobante, según tipoC31.
  numeroPreventivo?: string
  numeroDevengado?: string
  beneficiarios?: string[]
  /** Obligatorio al modificar un comprobante ya archivado */
  motivoModificacion?: string
  carpetas?: { carpetaId: string | number; numeroParte: number }[]
}

export type TipoAdjuntoC31 = 'C31' | 'RESPALDO'

/** Archivo digitalizado (PDF o imagen) de un comprobante. */
export interface C31Adjunto {
  id: number
  comprobanteId: number
  tipo: TipoAdjuntoC31
  nombreOriginal: string
  mimeType: string
  tamano: number
  fechaCarga: string
}

export const esDigitalizado = (c: { archivoAdjuntoUrl?: string | null }): boolean =>
  Boolean(c.archivoAdjuntoUrl)

export interface C31FilterState {
  /** Búsqueda libre (varios campos) */
  search?: string
  /** Detalle / glosa del gasto: "combustible", "pasajes"... */
  detalle?: string
  /** Beneficiario del directorio */
  beneficiarioId?: number | ''
  /** N° de preventivo (o devengado) */
  numeroPreventivo?: string
  depositoId?: number | ''
  estanteId?: number | ''
  carpetaId?: number | ''
  /** '' = todos · 'true' = digitalizados · 'false' = pendientes */
  digitalizado?: '' | 'true' | 'false'
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
  origen: 'REGISTRO' | 'MANUAL' | 'ACTA' | 'PRESTAMO' | 'SISTEMA' | 'MODIFICACION'
  referencia: string | null
  detalle: string | null
  usuario: string | null
}

/** Dónde está físicamente el comprobante y quién lo tiene. */
export interface C31UbicacionFisica {
  ubicacionFisica: string | null
  numeroFolio: string | null
  carpetas: {
    id: number
    numeroParte: number
    carpeta: string | null
    referencia: string | null
    estante: string | null
    deposito: string | null
  }[]
  enPoderDe: {
    solicitante: string
    institucionOArea: string
    desde: string
    devolucionEstimada: string | null
    vencido: boolean
    referencia: string
  } | null
}

export interface C31Seguimiento {
  comprobanteId: number
  estadoFisico: string
  acta: { id: number; numeroActa: string; estado: string } | null
  ubicacion: C31UbicacionFisica
  resumenPrestamos: { total: number; activos: number; vencidos: number; conNovedad: number }
  prestamos: C31PrestamoSeguimiento[]
  historial: C31HistorialItem[]
}

/** Comprobante unido a otro (GET /comprobantes-c31/:id/grupo). */
export interface C31GrupoMiembro {
  id: number
  tipoC31: TipoC31
  identificador: string
  estadoFisico: string
  montoTotal?: number | string | null
  actaEntregaId?: number | null
}
