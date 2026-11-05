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

// ─── Reglas de uso común en todo el sistema (espejo de las del servidor) ───

export const REGEX_CODIGO = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ .\/\-_]+$/
export const REGEX_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ .,'()\-]+$/
export const REGEX_PASSWORD = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/

export function emailValido(message = 'Ingrese un correo válido'): ValidatorRule<string> {
  return (v) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? null : message)
}

export function passwordFuerte(
  message = 'Entre 8 y 72 caracteres, con al menos una letra y un número',
): ValidatorRule<string> {
  return (v) => (!v || REGEX_PASSWORD.test(v) ? null : message)
}

export function usernameValido(): ValidatorRule<string> {
  return (v) =>
    !v || /^[a-z0-9._-]{3,50}$/.test(v)
      ? null
      : 'De 3 a 50 caracteres: minúsculas, números, punto, guion y guion bajo'
}

export function nombrePersona(
  message = "Solo letras, espacios y . , ' ( ) - (mínimo 3 caracteres)",
): ValidatorRule<string> {
  return (v) => (!v || (v.trim().length >= 3 && REGEX_NOMBRE.test(v.trim())) ? null : message)
}

export function telefonoValido(): ValidatorRule<string> {
  return (v) =>
    !v || /^[0-9+()\-\s]{6,30}$/.test(v.trim()) ? null : 'Solo números, +, -, ( ) y espacios'
}

export function codigoDocumento(
  message = 'Solo letras, números, espacios y . / - _',
): ValidatorRule<string> {
  return (v) => (!v || REGEX_CODIGO.test(v.trim()) ? null : message)
}

/** Fecha entre el año 2000 y el próximo año. */
export function fechaRazonable(
  message = 'La fecha está fuera de un rango razonable',
): ValidatorRule<string> {
  return (v) => {
    if (!v) return null
    const anio = Number(v.slice(0, 4))
    return anio >= 2000 && anio <= new Date().getFullYear() + 1 ? null : message
  }
}
