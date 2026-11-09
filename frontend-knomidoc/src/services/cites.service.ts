import apiClient from './api.client'

export type DireccionCite = 'EMITIDO' | 'RECIBIDO'
export interface CiteAdjunto {
  id: number
  nombreOriginal: string
  mimeType: string
  tamano: number
  fechaCarga: string
}
export interface Cite {
  id: number
  direccion: DireccionCite
  tipo: string
  correlativo?: number | null
  cite: string
  gestion: number
  fecha: string
  contraparte: string
  cargoContraparte?: string | null
  asunto: string
  referencia?: string | null
  observaciones?: string | null
  estado: 'REGISTRADO' | 'ANULADO'
  motivoAnulacion?: string | null
  origen: string
  totalAdjuntos?: number
  adjuntos?: CiteAdjunto[]
}
export interface CiteFiltros {
  gestion?: number | ''
  direccion?: DireccionCite | ''
  tipo?: string
  search?: string
  page?: number
  pageSize?: number
}
export type CitePayload = Partial<
  Pick<
    Cite,
    | 'tipo'
    | 'cite'
    | 'fecha'
    | 'contraparte'
    | 'cargoContraparte'
    | 'asunto'
    | 'referencia'
    | 'observaciones'
  >
> & {
  direccion?: DireccionCite
}

export const TIPOS_CITE = [
  { value: 'PS', label: 'PS · Planillas y Sueldos' },
  { value: 'AUD', label: 'AUD · Auditoría' },
  { value: 'CERT', label: 'CERT · Certificaciones' },
  { value: 'INF', label: 'INF · Informes' },
  { value: 'EXT', label: 'EXT · Correspondencia externa' },
  { value: 'OF', label: 'OF · Oficios / General' },
]

const R = '/cites'
const limpiar = (p: object) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v != null))

export const citesService = {
  list: (f: CiteFiltros = {}) =>
    apiClient.get<{ data: Cite[]; total: number }>(R, { params: limpiar(f) }).then((r) => r.data),
  get: (id: number) => apiClient.get<Cite>(`${R}/${id}`).then((r) => r.data),
  create: (p: CitePayload) => apiClient.post<Cite>(R, p).then((r) => r.data),
  update: (id: number, p: CitePayload) =>
    apiClient.patch<Cite>(`${R}/${id}`, p).then((r) => r.data),
  anular: (id: number, motivo: string) =>
    apiClient.patch<Cite>(`${R}/${id}/anular`, { motivo }).then((r) => r.data),
  subir(id: number, archivos: File[]) {
    const fd = new FormData()
    archivos.forEach((a) => fd.append('files', a))
    return apiClient.post<Cite>(`${R}/${id}/archivos`, fd).then((r) => r.data)
  },
  /** Planilla de control en Excel (N° CITE, Fecha, Serie, Destinatario, Referencia), con los filtros activos. */
  async exportar(f: CiteFiltros = {}) {
    const r = await apiClient.get(`${R}/export`, { params: limpiar(f), responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([r.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `planilla-cites-${f.gestion || 'todas'}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },
  eliminarArchivo: (id: number, adjuntoId: number) =>
    apiClient.delete(`${R}/${id}/archivos/${adjuntoId}`),
  /** Abre el respaldo (autenticado) en otra pestaña. */
  async abrirArchivo(id: number, adjuntoId: number, mime: string) {
    const ventana = window.open('', '_blank')
    try {
      const r = await apiClient.get(`${R}/${id}/archivos/${adjuntoId}`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([r.data], { type: mime }))
      if (ventana) ventana.location.href = url
      else window.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e) {
      ventana?.close()
      throw e
    }
  },
}
