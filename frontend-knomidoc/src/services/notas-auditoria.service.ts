import apiClient from './api.client'

export interface PersonaNota {
  nombre: string
  cargo: string
}
export interface SeccionNota {
  titulo: string
  texto: string
  items: string[]
}
export interface NotaAuditoria {
  id: number
  cite: string
  fecha: string
  destinatario: PersonaNota
  via?: PersonaNota | null
  remitente: PersonaNota
  referencia: string
  introduccion: string
  secciones: SeccionNota[]
  cierre: string
  gestion?: number | null
  notasPrestamo?: string[]
  solicitudId?: number
  estado?: 'BORRADOR' | 'EMITIDA'
  fechaEmision?: string | null
  historial?: { fecha: string; usuario?: string | null; motivo: string; campos: string[] }[]
}
export interface SolicitudAuditoria {
  id: number
  cite: string
  fecha: string
  solicitante: string
  cargoSolicitante?: string | null
  asunto: string
  texto: string
  gestion: number
  estado: 'PENDIENTE' | 'RESPONDIDA'
  notaAuditoriaId?: number | null
  observaciones?: string | null
  ejemplo?: boolean
}
export type SolicitudPayload = Partial<
  Omit<SolicitudAuditoria, 'id' | 'estado' | 'notaAuditoriaId' | 'ejemplo'>
>
export type BucketNota = 'entrega' | 'anteriores' | 'pendientes'
export interface ItemClasificado {
  comprobanteId: number
  prev: string
  dev: string
  rotulo: string
  numeros: string[]
  estado: string
  bucket: BucketNota
  motivo: string
}
export interface Clasificacion {
  gestion: number
  total: number
  items: ItemClasificado[]
  noRegistrados: string[]
}
export interface NotaPrestamoResumen {
  numero: string
  fecha: string
  institucion: string | null
  responsable: string | null
  total: number
}
export interface NotaDesdePrestamos {
  notasPrestamo: string[]
  destinatario: string
  institucion: string
  referencia: string
  secciones: SeccionNota[]
}
export type NotaAuditoriaPayload = Partial<Omit<NotaAuditoria, 'id'>> & {
  motivoModificacion?: string
}

const R = '/notas-auditoria'
export const notasAuditoriaService = {
  list: (search?: string) =>
    apiClient.get<NotaAuditoria[]>(R, { params: { search } }).then((r) => r.data),
  notasPrestamo: (search?: string) =>
    apiClient
      .get<NotaPrestamoResumen[]>(`${R}/notas-prestamo`, { params: { search } })
      .then((r) => r.data),
  desdePrestamos: (numeros: string[]) =>
    apiClient
      .get<NotaDesdePrestamos | null>(`${R}/desde-prestamos`, {
        params: { notas: numeros.join('|') },
      })
      .then((r) => r.data),
  solicitudes: (estado?: string, search?: string) =>
    apiClient
      .get<SolicitudAuditoria[]>(`${R}/solicitudes`, { params: { estado, search } })
      .then((r) => r.data),
  solicitud: (id: number) =>
    apiClient.get<SolicitudAuditoria>(`${R}/solicitudes/${id}`).then((r) => r.data),
  crearSolicitud: (p: SolicitudPayload) =>
    apiClient.post<SolicitudAuditoria>(`${R}/solicitudes`, p).then((r) => r.data),
  actualizarSolicitud: (id: number, p: SolicitudPayload) =>
    apiClient.patch<SolicitudAuditoria>(`${R}/solicitudes/${id}`, p).then((r) => r.data),
  eliminarSolicitud: (id: number) => apiClient.delete(`${R}/solicitudes/${id}`).then((r) => r.data),
  solicitudesEjemplo: (gestion?: number) =>
    apiClient
      .post<SolicitudAuditoria[]>(`${R}/solicitudes/ejemplo`, null, { params: { gestion } })
      .then((r) => r.data),
  clasificar: (p: { texto?: string; comprobanteIds?: number[]; gestion?: number }) =>
    apiClient.post<Clasificacion>(`${R}/clasificar`, p).then((r) => r.data),
  emitir: (id: number) => apiClient.patch<NotaAuditoria>(`${R}/${id}/emitir`).then((r) => r.data),
  create: (p: NotaAuditoriaPayload) => apiClient.post<NotaAuditoria>(R, p).then((r) => r.data),
  update: (id: number, p: NotaAuditoriaPayload) =>
    apiClient.patch<NotaAuditoria>(`${R}/${id}`, p).then((r) => r.data),
  remove: (id: number) => apiClient.delete(`${R}/${id}`).then((r) => r.data),
  async abrirPdf(id: number) {
    const ventana = window.open('', '_blank')
    try {
      const r = await apiClient.get(`${R}/${id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
      if (ventana) ventana.location.href = url
      else window.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e) {
      ventana?.close()
      throw e
    }
  },
}
