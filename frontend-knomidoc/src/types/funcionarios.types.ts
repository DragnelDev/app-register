export type EstadoFuncionario = 'ACTIVO' | 'INACTIVO'

/** Registro del directorio interno (no tiene acceso al sistema). */
export interface Funcionario {
  id: number
  ci: string
  nombres: string
  apellidos: string
  cargo: string
  unidadOficina: string
  telefono?: string | null
  estado: EstadoFuncionario
  fechaCreacion?: string
  fechaModificacion?: string
}

export interface FuncionarioPayload {
  ci: string
  nombres: string
  apellidos: string
  cargo: string
  unidadOficina: string
  telefono?: string
  estado?: EstadoFuncionario
}

export const nombreFuncionario = (f?: Pick<Funcionario, 'nombres' | 'apellidos'> | null) =>
  f ? `${f.nombres} ${f.apellidos}` : ''
