/**
 * Código de barras Code 128 (juego B) generado como SVG, sin dependencias.
 * Sirve para rotular depósitos, estantes y carpetas; cualquier lector USB lo
 * interpreta como teclado, así que escanear una etiqueta escribe el código en el
 * buscador activo.
 */
const PATRONES = [
  '212222',
  '222122',
  '222221',
  '121223',
  '121322',
  '131222',
  '122213',
  '122312',
  '132212',
  '221213',
  '221312',
  '231212',
  '112232',
  '122132',
  '122231',
  '113222',
  '123122',
  '123221',
  '223211',
  '221132',
  '221231',
  '213212',
  '223112',
  '312131',
  '311222',
  '321122',
  '321221',
  '312212',
  '322112',
  '322211',
  '212123',
  '212321',
  '232121',
  '111323',
  '131123',
  '131321',
  '112313',
  '132113',
  '132311',
  '211313',
  '231113',
  '231311',
  '112133',
  '112331',
  '132131',
  '113123',
  '113321',
  '133121',
  '313121',
  '211331',
  '231131',
  '213113',
  '213311',
  '213131',
  '311123',
  '311321',
  '331121',
  '312113',
  '312311',
  '332111',
  '314111',
  '221411',
  '431111',
  '111224',
  '111422',
  '121124',
  '121421',
  '141122',
  '141221',
  '112214',
  '112412',
  '122114',
  '122411',
  '142112',
  '142211',
  '241211',
  '221114',
  '413111',
  '241112',
  '134111',
  '111242',
  '121142',
  '121241',
  '114212',
  '124112',
  '124211',
  '411212',
  '421112',
  '421211',
  '212141',
  '214121',
  '412121',
  '111143',
  '111341',
  '131141',
  '114113',
  '114311',
  '411113',
  '411311',
  '113141',
  '114131',
  '311141',
  '411131',
  '211412',
  '211214',
  '211232',
  '2331112',
]
const START_B = 104
const STOP = 106

/** Deja solo caracteres imprimibles ASCII (32–126); el resto se reemplaza por "-". */
export function textoCode128(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7e]/g, '-')
}

/** Anchos alternados barra/espacio (en módulos) del código completo. */
export function anchosCode128(texto: string): number[] {
  const t = textoCode128(texto)
  const valores = [START_B, ...Array.from(t, (c) => c.charCodeAt(0) - 32)]
  const control = valores.reduce((s, v, i) => s + (i === 0 ? v : v * i), 0) % 103
  valores.push(control, STOP)
  return valores.flatMap((v) => Array.from(PATRONES[v]!, Number))
}

/** SVG listo para incrustar (`v-html`) o imprimir. */
export function svgCode128(
  texto: string,
  opciones: { alto?: number; modulo?: number; margen?: number } = {},
) {
  const { alto = 46, modulo = 1.6, margen = 10 } = opciones
  const anchos = anchosCode128(texto)
  let x = margen
  let barras = ''
  anchos.forEach((w, i) => {
    if (i % 2 === 0)
      barras += `<rect x="${x.toFixed(2)}" y="0" width="${(w * modulo).toFixed(2)}" height="${alto}"/>`
    x += w * modulo
  })
  const total = x + margen
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total.toFixed(2)} ${alto}" width="${total.toFixed(0)}" height="${alto}" fill="#000" role="img" aria-label="Código de barras ${textoCode128(texto)}">${barras}</svg>`
}
