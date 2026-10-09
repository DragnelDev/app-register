export interface ParametroGestion {
  id: number
  gestion: number
  estado: 'ABIERTA' | 'CERRADA'
  activa: boolean
  fechaApertura?: string | null
  fechaCierre?: string | null
  observaciones?: string | null
  totalComprobantes?: number
}

export interface ParametroGestionPayload {
  gestion: number
  fechaApertura?: string
  observaciones?: string
}

export interface AuditoriaLog {
  id: number
  fecha: string
  usuarioId?: number | null
  usuarioNombre?: string | null
  rol?: string | null
  accion: string
  entidad: string
  registroId?: string | null
  metodo: string
  ruta: string
  ip?: string | null
  detalle?: Record<string, unknown> | null
}

export interface AuditoriaFiltros {
  entidades: string[]
  acciones: string[]
}

interface Agrupado {
  cantidad: number
  monto: number
}

export interface ReporteFinanciero {
  totales: Agrupado & { promedio: number }
  anulados: Agrupado
  porTipo: (Agrupado & { tipo: string })[]
  porEstado: (Agrupado & { estado: string })[]
  porMes: (Agrupado & { mes: number })[]
  porGestion: (Agrupado & { gestion: number })[]
  topBeneficiarios: (Agrupado & { nombre: string })[]
}

export interface ReporteFiltros {
  gestion?: number | ''
  tipoC31?: 'CON_IMPUTACION' | 'SIN_IMPUTACION' | ''
  fechaDesde?: string
  fechaHasta?: string
}
