const ENTERO_SIN_AGRUPAR = /^\d+$/
const ENTERO_AGRUPADO = /^\d{1,3}(?:\.\d{3})+$/

export function formatMontoBo(valor: number): string {
  return new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor)
}

export function parseMontoBo(valor: string): number | null {
  const texto = valor.trim()
  if (!texto) return null

  const signo = texto.startsWith('-') ? '-' : ''
  const sinSigno = texto.replace(/^[+-]/, '')
  let entero: string
  let decimales = ''

  if (sinSigno.includes(',')) {
    const partes = sinSigno.split(',')
    const [parteEntera, parteDecimal] = partes
    if (partes.length !== 2 || parteEntera === undefined || parteDecimal === undefined) return null
    if (!/^\d{1,2}$/.test(parteDecimal)) return null
    entero = parteEntera
    decimales = parteDecimal
    if (!ENTERO_SIN_AGRUPAR.test(entero) && !ENTERO_AGRUPADO.test(entero)) return null
    entero = entero.replace(/\./g, '')
  } else if (sinSigno.includes('.')) {
    if (ENTERO_AGRUPADO.test(sinSigno)) {
      entero = sinSigno.replace(/\./g, '')
    } else {
      const partes = sinSigno.split('.')
      const [parteEntera, parteDecimal] = partes
      if (
        partes.length !== 2 ||
        parteEntera === undefined ||
        parteDecimal === undefined ||
        !ENTERO_SIN_AGRUPAR.test(parteEntera) ||
        !/^\d{1,2}$/.test(parteDecimal)
      ) {
        return null
      }
      entero = parteEntera
      decimales = parteDecimal
    }
  } else {
    if (!ENTERO_SIN_AGRUPAR.test(sinSigno)) return null
    entero = sinSigno
  }

  const monto = Number(`${signo}${entero}.${decimales.padEnd(2, '0')}`)
  return Number.isFinite(monto) ? monto : null
}
