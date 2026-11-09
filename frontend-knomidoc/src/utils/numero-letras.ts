const UNIDADES = [
  'cero',
  'uno',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
  'diez',
  'once',
  'doce',
  'trece',
  'catorce',
  'quince',
  'dieciséis',
  'diecisiete',
  'dieciocho',
  'diecinueve',
  'veinte',
  'veintiuno',
  'veintidós',
  'veintitrés',
  'veinticuatro',
  'veinticinco',
  'veintiséis',
  'veintisiete',
  'veintiocho',
  'veintinueve',
]
const DECENAS = [
  '',
  '',
  '',
  'treinta',
  'cuarenta',
  'cincuenta',
  'sesenta',
  'setenta',
  'ochenta',
  'noventa',
]
const CENTENAS = [
  '',
  'ciento',
  'doscientos',
  'trescientos',
  'cuatrocientos',
  'quinientos',
  'seiscientos',
  'setecientos',
  'ochocientos',
  'novecientos',
]

function menorDeMil(n: number): string {
  if (n < 30) return UNIDADES[n]!
  if (n < 100) {
    const d = Math.floor(n / 10)
    const u = n % 10
    return u ? `${DECENAS[d]} y ${UNIDADES[u]}` : DECENAS[d]!
  }
  if (n === 100) return 'cien'
  const c = Math.floor(n / 100)
  const r = n % 100
  return r ? `${CENTENAS[c]} ${menorDeMil(r)}` : CENTENAS[c]!
}

/** 23 → "veintitrés"; 85 → "ochenta y cinco"; 1 → "uno" (apocopa a "un" ante sustantivo). */
export function numeroEnLetras(n: number, apocopar = false): string {
  const v = Math.trunc(Math.abs(n))
  if (v >= 1_000_000) return String(v)
  let t: string
  if (v < 1000) t = menorDeMil(v)
  else {
    const miles = Math.floor(v / 1000)
    const r = v % 1000
    const m = miles === 1 ? 'mil' : `${numeroEnLetras(miles, true)} mil`
    t = r ? `${m} ${menorDeMil(r)}` : m
  }
  if (!apocopar) return t
  return t.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un')
}

/** "veintitrés (23)" / "un (1)" listo para escribir antes de un sustantivo. */
export const cantidadEnTexto = (n: number) => `${numeroEnLetras(n, true)} (${n})`
