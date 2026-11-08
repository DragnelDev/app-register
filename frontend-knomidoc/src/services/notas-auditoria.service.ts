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
export type NotaAuditoriaPayload = Partial<Omit<NotaAuditoria, 'id'>>

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
