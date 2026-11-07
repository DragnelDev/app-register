/**
 * Fechas tal como se copian del SIGEP o de Excel: dd/mm/aaaa (también con - o .),
 * con o sin hora ("05/11/2026 10:30:00"), o ya en ISO (aaaa-mm-dd).
 * Devuelve aaaa-mm-dd, o null si no es una fecha válida.
 */
export function parseFechaBo(texto: string): string | null {
  const t = texto.trim()
  if (!t) return null
  let d: number, m: number, y: number
  let r = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4}|\d{2})(?:[\sT].*)?$/.exec(t)
  if (r) {
    d = Number(r[1])
    m = Number(r[2])
    y = Number(r[3])
    if (r[3]!.length === 2) y += 2000
  } else {
    r = /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})(?:[\sT].*)?$/.exec(t)
    if (!r) return null
    y = Number(r[1])
    m = Number(r[2])
    d = Number(r[3])
  }
  const f = new Date(Date.UTC(y, m - 1, d))
  if (f.getUTCFullYear() !== y || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** 2026-11-05 → "05/11/2026" */
export function formatFechaBo(iso: string | null | undefined): string {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return y && m && d ? `${d}/${m}/${y}` : ''
}
