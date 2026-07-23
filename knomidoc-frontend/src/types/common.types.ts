// Tipos compartidos entre módulos, alineados a las convenciones del backend NestJS

export type EstadoFisico = 'EN_ARCHIVO' | 'PRESTADO'
export type EstadoPrestamo = 'PRESTADO' | 'DEVUELTO'
export type EstadoAprobacion = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'
export type RolUsuario = 'ADMIN' | 'REGISTRADOR' | 'CONSULTA'

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
