/** Respuesta de GET /resumen: alimenta el panel principal y las insignias del menú. */
export interface ResumenSistema {
  comprobantes: {
    total: number
    enTramite: number
    enArchivo: number
    prestados: number
    anulados: number
    conImputacion: number
    sinImputacion: number
  }
  /** Comprobantes vigentes que aún requieren regularizar su vínculo. */
  regularizacion: {
    sinActa: number
    sinCarpeta: number
    total: number
  }
  archivo: { depositos: number; estantes: number; carpetas: number }
  actas: number
  prestamosActivos: { cuaderno: number; nota: number }
}
