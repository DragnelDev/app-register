export type TipoPersona = 'NATURAL' | 'JURIDICA'
export type TipoDocumento = 'CI' | 'NIT' | 'OTRO' | 'SIN_DOCUMENTO'

export interface Beneficiario {
  id: number
  tipoPersona: TipoPersona
  nombre: string
  tipoDocumento: TipoDocumento
  numeroDocumento?: string | null
  telefono?: string | null
  email?: string | null
  direccion?: string | null
  estado: 'ACTIVO' | 'INACTIVO'
}

export interface BeneficiarioPayload {
  tipoPersona?: TipoPersona
  nombre: string
  tipoDocumento?: TipoDocumento
  numeroDocumento?: string
  telefono?: string
  email?: string
  direccion?: string
  estado?: 'ACTIVO' | 'INACTIVO'
}

export interface BeneficiarioFiltros {
  search?: string
  tipoPersona?: string
  tipoDocumento?: string
  estado?: string
  gestion?: string
  conComprobantes?: string
}

export interface BeneficiarioFicha {
  beneficiario: Beneficiario
  resumen: { comprobantes: number; pagos: number; totalPagado: number }
  porGestion: { gestion: number; cantidad: number; monto: number }[]
  comprobantes: {
    id: number
    gestion: number
    tipoC31: string
    montoTotal: number
    estadoFisico?: string
    descripcion?: string
    preventivos?: { numeroPreventivo: string }[]
    devengados?: { numeroDevengado: string }[]
  }[]
}

export const documentoBeneficiario = (b: Pick<Beneficiario, 'tipoDocumento' | 'numeroDocumento'>) =>
  b.numeroDocumento ? `${b.tipoDocumento} ${b.numeroDocumento}` : 'Sin documento'
