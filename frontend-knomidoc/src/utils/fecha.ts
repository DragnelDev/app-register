function esFechaValida(anio: number, mes: number, dia: number): boolean {
  if (mes < 1 || mes > 12 || dia < 1) return false
  const bisiesto = anio % 4 === 0 && (anio % 100 !== 0 || anio % 400 === 0)
  const diasPorMes = [31, bisiesto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  const maximoDia = diasPorMes[mes - 1]
  return maximoDia !== undefined && dia <= maximoDia
}

export function parseFechaBo(valor: string): string | null {
  const texto = valor.trim()
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:$|T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$)/.exec(
    texto,
  )
  const local = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/.exec(
    texto,
  )

  if (iso) {
    const [, anioTexto, mesTexto, diaTexto] = iso
    const anio = Number(anioTexto)
    const mes = Number(mesTexto)
    const dia = Number(diaTexto)
    return esFechaValida(anio, mes, dia) ? `${anioTexto}-${mesTexto}-${diaTexto}` : null
  }

  if (local) {
    const [, diaTexto, mesTexto, anioTexto] = local
    const dia = Number(diaTexto)
    const mes = Number(mesTexto)
    const anio = Number(anioTexto)
    if (!esFechaValida(anio, mes, dia)) return null
    return `${anioTexto}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  }

  return null
}

export function formatFechaBo(valor: string): string {
  const iso = parseFechaBo(valor)
  if (!iso) return ''
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}
