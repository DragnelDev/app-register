/**
 * Reglas de validación reutilizables para formularios del frontend.
 * Cada regla retorna `null` si el valor es válido, o un mensaje de error (string) si no lo es.
 * Se combinan con `runValidators` dentro de cada formulario.
 */

export type ValidatorRule<T = unknown> = (value: T) => string | null

export function required(message = 'Este campo es obligatorio'): ValidatorRule<unknown> {
  return (value) => {
    if (value === null || value === undefined) return message
    if (typeof value === 'string' && value.trim() === '') return message
    if (Array.isArray(value) && value.length === 0) return message
    return null
  }
}

export function minLength(min: number, message?: string): ValidatorRule<string> {
  return (value) => {
    if (!value) return null
    return value.trim().length < min ? (message ?? `Debe tener al menos ${min} caracteres`) : null
  }
}

export function maxLength(max: number, message?: string): ValidatorRule<string> {
  return (value) => {
    if (!value) return null
    return value.trim().length > max ? (message ?? `No puede superar los ${max} caracteres`) : null
  }
}

export function isValidDate(message = 'Ingrese una fecha válida'): ValidatorRule<string> {
  return (value) => {
    if (!value) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? message : null
  }
}

export function dateNotInFuture(
  message = 'La fecha no puede ser posterior al día de hoy',
): ValidatorRule<string> {
  return (value) => {
    if (!value) return null
    const date = new Date(`${value}T23:59:59`)
    if (Number.isNaN(date.getTime())) return null
    return date.getTime() > Date.now() ? message : null
  }
}

export function isPositiveNumber(message = 'Debe ser un número mayor a 0'): ValidatorRule<number> {
  return (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return message
    return Number(value) > 0 ? null : message
  }
}

export function minArrayLength<T>(min: number, message?: string): ValidatorRule<T[]> {
  return (value) => {
    const length = value?.length ?? 0
    return length < min
      ? (message ?? `Debe agregar al menos ${min} elemento${min === 1 ? '' : 's'}`)
      : null
  }
}

export function pattern(regex: RegExp, message: string): ValidatorRule<string> {
  return (value) => {
    if (!value) return null
    return regex.test(value.trim()) ? null : message
  }
}

/** Ejecuta una lista de reglas sobre un valor y retorna el primer mensaje de error encontrado (o null). */
export function runValidators<T>(value: T, rules: ValidatorRule<T>[]): string | null {
  for (const rule of rules) {
    const error = rule(value)
    if (error) return error
  }
  return null
}
