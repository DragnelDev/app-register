// Tipos compartidos entre módulos, alineados al DER/MER actual del backend NestJS

export type EstadoFisico = 'EN_ARCHIVO' | 'PRESTADO' | 'ANULADO' | 'EN_TRAMITE'
export type TipoC31 = 'CON_IMPUTACION' | 'SIN_IMPUTACION'
export type EstadoPrestamoNota = 'ENTREGADO' | 'DEVUELTO'
export type MetodoVerificacion = 'FIRMA_MANUAL' | 'HUELLA_DIGITAL'
export type RolUsuario = 'ADMIN' | 'OPERADOR_ARCHIVOS' | 'ENCARGADO_PRESTAMOS' | 'CONSULTA_EXTERNA'

/** Envelope estándar de respuesta paginada del backend */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

/** Envelope estándar de error de la API */
export interface ApiErrorResponse {
  statusCode: number
  message: string | string[]
  error?: string
}

export interface QueryParams {
  page?: number
  pageSize?: number
  search?: string
  [key: string]: unknown
}
