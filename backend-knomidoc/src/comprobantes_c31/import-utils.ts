/** Utilidades para leer el Excel de importación (formato SIGEP / institucional). */

/** Texto sin tildes, en mayúsculas y solo letras/números: "Nº DEV." → "NDEV" */
export function normalizarEncabezado(v: unknown): string {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export type CampoImport =
  | 'prev'
  | 'dev'
  | 'cheque'
  | 'beneficiario'
  | 'descripcion'
  | 'monto'
  | 'fecha'
  | 'folio'
  | 'carpeta'
  | 'ubicacion'
  | 'estado'
  | 'observaciones';

/** Clasifica un encabezado; DEV se evalúa antes que PREV ("Nº PREV/DEV" no existe). */
export function campoDeEncabezado(encabezado: unknown): CampoImport | null {
  const h = normalizarEncabezado(encabezado);
  if (!h) return null;
  if (h.includes('ESTADO')) return 'estado';
  if (h.includes('OBSERVACION')) return 'observaciones';
  if (h.includes('UBICACION')) return 'ubicacion';
  if (h.includes('DEV')) return 'dev';
  if (h.includes('PREV')) return 'prev';
  if (h.includes('CHEQUE')) return 'cheque';
  if (h.includes('BENEFICIARIO')) return 'beneficiario';
  if (h.includes('DESCRIPCION') || h.includes('GLOSA') || h.includes('DETALLE'))
    return 'descripcion';
  if (h.includes('MONTO') || h.includes('IMPORTE')) return 'monto';
  if (h.includes('FECHA')) return 'fecha';
  if (h.includes('FOLIO')) return 'folio';
  if (h.includes('CARPETA')) return 'carpeta';
  return null;
}

/**
 * Monto en formato boliviano (12.345,67) o americano (12,345.67 / 2,600.00),
 * con o sin "Bs". Devuelve null si no se puede interpretar.
 */
export function parseMonto(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  const t = String(valor ?? '')
    .replace(/bs\.?/gi, '')
    .replace(/[\s ']/g, '');
  if (!t || !/^[0-9.,]+$/.test(t) || !/\d/.test(t)) return null;

  const puntos = t.split('.').length - 1;
  const comas = t.split(',').length - 1;
  let entera: string;
  let dec = '';

  if (puntos > 0 && comas > 0) {
    const decSep = t.lastIndexOf('.') > t.lastIndexOf(',') ? '.' : ',';
    const milSep = decSep === '.' ? ',' : '.';
    if (t.split(decSep).length - 1 !== 1) return null;
    const [e, d = ''] = t.split(decSep);
    if (e.includes(decSep) || d.includes(milSep)) return null;
    entera = e.split(milSep).join('');
    dec = d;
  } else if (puntos > 0 || comas > 0) {
    const sep = puntos > 0 ? '.' : ',';
    const cant = puntos > 0 ? puntos : comas;
    const ult = t.slice(t.lastIndexOf(sep) + 1);
    if (cant > 1 || ult.length === 3) {
      entera = t.split(sep).join(''); // separador de miles
    } else {
      entera = t.slice(0, t.lastIndexOf(sep));
      dec = ult;
    }
  } else {
    entera = t;
  }
  if (!/^\d+$/.test(entera || '0') || !/^\d{0,2}$/.test(dec)) return null;
  const n = Number(`${entera || '0'}.${dec || '0'}`);
  return Number.isFinite(n) ? n : null;
}

/**
 * Fecha de una celda: Date de Excel, número de serie, o texto dd/mm/aaaa
 * (también con - o .) o aaaa-mm-dd. Devuelve aaaa-mm-dd o null si no es válida.
 */
export function parseFechaCelda(valor: unknown): string | null {
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime())
      ? null
      : valor.toISOString().slice(0, 10);
  }
  if (typeof valor === 'number') {
    // Número de serie de Excel (días desde 1899-12-30)
    if (valor < 1 || valor > 80000) return null;
    return new Date(Date.UTC(1899, 11, 30) + Math.round(valor) * 86400000)
      .toISOString()
      .slice(0, 10);
  }
  const t = String(valor ?? '').trim();
  if (!t) return null;
  let d: number, m: number, y: number;
  let r = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4}|\d{2})(?:[\sT].*)?$/.exec(t);
  if (r) {
    d = Number(r[1]);
    m = Number(r[2]);
    y = Number(r[3]) + (r[3].length === 2 ? 2000 : 0);
  } else {
    r = /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})(?:[\sT].*)?$/.exec(t);
    if (!r) return null;
    y = Number(r[1]);
    m = Number(r[2]);
    d = Number(r[3]);
  }
  const f = new Date(Date.UTC(y, m - 1, d));
  if (
    f.getUTCFullYear() !== y ||
    f.getUTCMonth() !== m - 1 ||
    f.getUTCDate() !== d
  )
    return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Lista de N° en una celda: "394, 395" / "12;13" / saltos de línea. */
export function listaDeCelda(texto: string): string[] {
  return texto
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Varios N° en una misma celda: "DEV.5/6", "4-5", "6 7", "8-9-10", "2/3", "1 y 2",
 * "PREV 3, 4". Quita prefijos (DEV., PREV., Nº) y separa por / - , ; espacio, "y" o salto de línea.
 * Un guion se toma como separador de lista (no como rango); si salta números ("4-8")
 * se devuelve una advertencia para que se revise en la vista previa.
 */
export function numerosDeCelda(texto: string): {
  numeros: string[];
  advertencias: string[];
} {
  const limpio = texto
    .replace(/(?:PREVENTIVOS?|DEVENGADOS?|PREV|DEV|NRO|N[º°])\.?/gi, ' ')
    .trim();
  const advertencias: string[] = [];
  const numeros: string[] = [];
  for (const t of limpio.split(/[\s,;\/\-\n]+|\by\b/i)) {
    const n = t.trim().replace(/^\.+|\.+$/g, '');
    if (!n) continue;
    if (!/^[A-Za-z0-9]+$/.test(n)) {
      advertencias.push(`"${n}" no parece un número válido`);
      continue;
    }
    if (!numeros.includes(n)) numeros.push(n);
  }
  // Rango probable: guion entre dos números que no son consecutivos
  const m = /(\d+)\s*-\s*(\d+)/g;
  let r: RegExpExecArray | null;
  while ((r = m.exec(limpio))) {
    if (Number(r[2]) - Number(r[1]) > 1) {
      advertencias.push(
        `"${r[1]}-${r[2]}" se tomó como dos números (${r[1]} y ${r[2]}); si era un rango, corríjalo`,
      );
    }
  }
  return { numeros, advertencias };
}

/** Código de carpeta con convención <gestión>-<N° a 3 cifras>: 4 → "2017-004". */
export function codigoDeCarpeta(gestion: number, numero: string): string {
  return /^\d+$/.test(numero)
    ? `${gestion}-${numero.padStart(3, '0')}`
    : `${gestion}-${numero.toUpperCase()}`.slice(0, 50);
}
