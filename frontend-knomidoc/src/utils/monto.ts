/**
 * Montos al estilo contable de Bolivia: punto para miles y coma para decimales
 * (12.345,67). También se acepta lo que llega pegado desde Excel o el SIGEP:
 * "12345,67", "12345.67", "Bs 12.345,67", "1.234.567".
 */
export function parseMontoBo(texto: string): number | null {
  let t = texto.replace(/bs\.?/gi, '').replace(/[\s ]/g, '')
  if (!t) return null
  if (!/^[0-9.,]+$/.test(t)) return null

  if (t.includes(',')) {
    // La coma es el separador decimal; los puntos son miles
    const partes = t.split(',')
    if (partes.length > 2) return null
    const entera = (partes[0] ?? '').replace(/\./g, '')
    const dec = partes[1] ?? ''
    if (!/^\d*$/.test(entera) || !/^\d{0,2}$/.test(dec)) return null
    return Number(`${entera || '0'}.${dec || '0'}`)
  }
  const puntos = t.split('.').length - 1
  if (puntos === 0) return Number(t)
  // Con solo puntos: miles si hay varios o si el último grupo tiene 3 dígitos
  const ultimo = t.slice(t.lastIndexOf('.') + 1)
  if (puntos > 1 || ultimo.length === 3) {
    if (!/^\d{1,3}(\.\d{3})+$/.test(t)) return null
    t = t.replace(/\./g, '')
    return Number(t)
  }
  // Un solo punto con 1-2 decimales (formato 9200.50)
  return /^\d+\.\d{1,2}$/.test(t) ? Number(t) : null
}

/** 12345.6 → "12.345,60" */
export function formatMontoBo(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return ''
  return new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}
