import { AxiosError } from 'axios'
import type { ApiErrorResponse } from '@/types/common.types'

/** Extrae un mensaje de error legible desde un error de axios (o desconocido) para mostrarlo en el frontend. */
export function extractApiErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado. Intenta nuevamente.'): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorResponse | undefined
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(' ') : data.message
    }
    if (error.message) return error.message
  }
  if (error instanceof Error) return error.message
  return fallback
}
