import { EntityManager, In } from 'typeorm';
import { ComprobantesC31 } from '../../comprobantes_c31/entities/comprobantes_c31.entity';
import { devengadosDe, preventivosDe } from './identificador-c31.util';

/**
 * Rótulo de un grupo de comprobantes unidos: "PREV 8 - DEV 7".
 * Primero los preventivos (ascendente) y luego los devengados.
 */
export function rotuloDeGrupo(miembros: ComprobantesC31[]): string {
  const num = (s: string) => parseInt(s.replace(/\D/g, ''), 10) || 0;
  const prev: string[] = [];
  const dev: string[] = [];
  for (const m of miembros) {
    preventivosDe(m).forEach((p) => prev.push(p));
    devengadosDe(m).forEach((d) => dev.push(d));
  }
  prev.sort((a, b) => num(a) - num(b));
  dev.sort((a, b) => num(a) - num(b));
  return [...prev.map((p) => `PREV ${p}`), ...dev.map((d) => `DEV ${d}`)].join(
    ' - ',
  );
}

/** Recorre cualquier estructura y junta los objetos que traen `grupoUnionId`. */
function recolectar(
  nodo: unknown,
  salida: Record<string, unknown>[],
  prof = 0,
) {
  if (!nodo || typeof nodo !== 'object' || prof > 8) return;
  if (Buffer.isBuffer(nodo) || nodo instanceof Date) return;
  if (Array.isArray(nodo)) {
    for (const n of nodo) recolectar(n, salida, prof + 1);
    return;
  }
  const obj = nodo as Record<string, unknown>;
  if (typeof obj['grupoUnionId'] === 'string' && obj['grupoUnionId'])
    salida.push(obj);
  for (const k of Object.keys(obj)) recolectar(obj[k], salida, prof + 1);
}

/**
 * A cada comprobante unido dentro de `raiz` le agrega `rotuloGrupo`
 * ("PREV 8 - DEV 7"). Una sola consulta para todos los grupos.
 */
export async function adjuntarRotuloGrupo(
  manager: EntityManager,
  raiz: unknown,
): Promise<void> {
  const objetos: Record<string, unknown>[] = [];
  recolectar(raiz, objetos);
  if (!objetos.length) return;
  const ids = [...new Set(objetos.map((o) => o['grupoUnionId'] as string))];
  const miembros = await manager.getRepository(ComprobantesC31).find({
    where: { grupoUnionId: In(ids) },
    relations: { preventivos: true, devengados: true },
    select: { id: true, grupoUnionId: true },
  });
  const porGrupo = new Map<string, ComprobantesC31[]>();
  for (const m of miembros) {
    const g = m.grupoUnionId as string;
    porGrupo.set(g, [...(porGrupo.get(g) ?? []), m]);
  }
  const rotulos = new Map<string, string>();
  for (const [g, lista] of porGrupo)
    if (lista.length > 1) rotulos.set(g, rotuloDeGrupo(lista));
  for (const o of objetos) {
    const r = rotulos.get(o['grupoUnionId'] as string);
    if (r) o['rotuloGrupo'] = r;
  }
}
