/**
 * Montos pegados desde Excel, el SIGEP o escritos a mano. Acepta formato boliviano
 * (12.345,67) y americano (12,345.67 / 2,600.00 / 1,234,567.89), con o sin "Bs",
 * y cualquier cantidad de millones. Reglas:
 *  - si hay ambos separadores, el ÚLTIMO es el decimal y el otro es de miles;
 *  - con un solo tipo de separador repetido (1.234.567 o 1,234,567) es de miles;
 *  - con un solo separador: si le siguen exactamente 3 dígitos es de miles
 *    (2,600 → 2600), si le siguen 1-2 dígitos es decimal (9200,5 → 9200.50).
 */
export function parseMontoBo(texto: string): number | null {
  const t = texto.replace(/bs\.?/gi, '').replace(/[\s\u00a0']/g, '')
  if (!t || !/^[0-9.,]+$/.test(t) || !/\d/.test(t)) return null

  const ultimoPunto = t.lastIndexOf('.')
  const ultimaComa = t.lastIndexOf(',')
  const puntos = t.split('.').length - 1
  const comas = t.split(',').length - 1

  let entera: string
  let dec = ''
  if (puntos > 0 && comas > 0) {
    const decSep = ultimoPunto > ultimaComa ? '.' : ','
    const milSep = decSep === '.' ? ',' : '.'
    if (t.split(decSep).length - 1 !== 1) return null // el decimal aparece una sola vez
    const [e, d = ''] = t.split(decSep) as [string, string?]
    if (e.includes(decSep) || d.includes(milSep)) return null
    entera = e
    dec = d
    if (!/^\d{1,3}(\.\d{3})*$|^\d{1,3}(,\d{3})*$/.test(entera)) return null
    entera = entera.split(milSep).join('')
  } else if (puntos > 0 || comas > 0) {
    const sep = puntos > 0 ? '.' : ','
    const cant = puntos > 0 ? puntos : comas
    const ult = t.slice(t.lastIndexOf(sep) + 1)
    if (cant > 1 || ult.length === 3) {
      // Separador de miles
      const re = sep === '.' ? /^\d{1,3}(\.\d{3})+$/ : /^\d{1,3}(,\d{3})+$/
      if (!re.test(t)) return null
      entera = t.split(sep).join('')
    } else {
      entera = t.slice(0, t.lastIndexOf(sep))
      dec = ult
    }
  } else {
    entera = t
  }
  if (!/^\d+$/.test(entera || '0') || !/^\d{0,2}$/.test(dec)) return null
  const n = Number(`${entera || '0'}.${dec || '0'}`)
  return Number.isFinite(n) ? n : null
}

/** 12345.6 → "12.345,60" */
export function formatMontoBo(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return ''
  return new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}
