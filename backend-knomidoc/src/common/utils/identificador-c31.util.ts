interface ConIdentificadores {
  rotuloGrupo?: string | null;
  preventivos?: { numeroPreventivo?: string | null }[] | null;
  devengados?: { numeroDevengado?: string | null }[] | null;
}

export const preventivosDe = (c?: ConIdentificadores | null): string[] =>
  (c?.preventivos ?? [])
    .map((p) => p.numeroPreventivo?.trim() ?? '')
    .filter(Boolean);

export const devengadosDe = (c?: ConIdentificadores | null): string[] =>
  (c?.devengados ?? [])
    .map((d) => d.numeroDevengado?.trim() ?? '')
    .filter(Boolean);

/**
 * Identificador legible de un C31, que puede agrupar varios PREV y/o DEV:
 *   "3 / 7"            → dos preventivos unidos
 *   "45"               → un devengado (sin imputación)
 *   "12 · Dev. 45"     → preventivo y devengado en un mismo comprobante
 */
export function identificadorC31(
  c?: ConIdentificadores | null,
  vacio = '',
): string {
  const prev = preventivosDe(c).join(' / ');
  const dev = devengadosDe(c).join(' / ');
  if (prev && dev) return `${prev} · Dev. ${dev}`;
  return prev || dev || vacio;
}

/**
 * Identificador rotulado: la numeración de preventivos y de devengados es
 * independiente (PREV 1 y DEV 1 no son lo mismo), así que siempre se indica
 * el tipo. Ej.: "PREV 3 / 7", "DEV 45", "PREV 12 · DEV 45".
 */
export function rotuloC31(c?: ConIdentificadores | null, vacio = ''): string {
  if (c?.rotuloGrupo) return c.rotuloGrupo;
  const prev = preventivosDe(c).join(' / ');
  const dev = devengadosDe(c).join(' / ');
  const partes = [prev && `PREV ${prev}`, dev && `DEV ${dev}`].filter(Boolean);
  return partes.join(' · ') || vacio;
}
