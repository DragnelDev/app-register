/**
 * Base de datos EN MEMORIA para probar ComprobantesC31Service sin PostgreSQL.
 *
 * No es un mock "ciego": implementa de verdad las operaciones que usa el
 * servicio (guardar, buscar, contar, actualizar y la consulta de unicidad), de
 * modo que las reglas de negocio se ejecutan contra datos reales en memoria.
 *
 *  - Unicidad: `createQueryBuilder(...).getExists()` evalúa la misma condición
 *    que el SQL real (misma gestión, mismo N° sin distinguir mayúsculas, estado
 *    distinto de ANULADO, excluyendo opcionalmente el propio id).
 *  - Conteos de ubicación y pagos se controlan desde `db.ubicaciones` y `db.pagos`.
 */
import { ComprobantesC31 } from '../../src/comprobantes_c31/entities/comprobantes_c31.entity';
import { C31Preventivo } from '../../src/c31-preventivos/entities/c31-preventivo.entity';
import { C31Devengado } from '../../src/c31-devengados/entities/c31-devengado.entity';
import { C31CarpetasUbicacion } from '../../src/c31-carpetas-ubicacion/entities/c31-carpetas-ubicacion.entity';
import { C31Pago } from '../../src/c31-pagos/entities/c31-pago.entity';
import { C31Historial } from '../../src/c31-historial/entities/c31-historial.entity';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface FakeC31Db {
  filas: any[];
  historial: any[];
  pagos: { comprobanteId: number; estadoPago: string }[];
  /** comprobanteId → cantidad de carpetas en las que está ubicado */
  ubicaciones: Record<number, number>;
  seq: number;
}

/** Evalúa la consulta de unicidad (PREV o DEV) sobre las filas en memoria. */
function consultaUnicidad(db: FakeC31Db) {
  const st: { relacion: string; params: Record<string, any> } = {
    relacion: '',
    params: {},
  };
  const qb: any = {
    innerJoin: (relacion: string) => {
      st.relacion = relacion;
      return qb;
    },
    where: (_sql: string, p: any) => (Object.assign(st.params, p), qb),
    andWhere: (_sql: string, p: any) => (Object.assign(st.params, p), qb),
    getExists: async () => {
      const { gestion, anulado, numero, excluirId } = st.params;
      return db.filas.some((f) => {
        if (f.gestion !== gestion || f.estadoFisico === anulado) return false;
        if (excluirId !== undefined && f.id === excluirId) return false;
        const lista: string[] =
          st.relacion === 'c.preventivos'
            ? (f.preventivos ?? []).map((p: any) => p.numeroPreventivo)
            : (f.devengados ?? []).map((d: any) => d.numeroDevengado);
        return lista.some(
          (n) => n.toUpperCase() === String(numero).toUpperCase(),
        );
      });
    },
  };
  return qb;
}

export function crearFakeC31Db() {
  const db: FakeC31Db = {
    filas: [],
    historial: [],
    pagos: [],
    ubicaciones: {},
    seq: 0,
  };

  const porId = (id: number) => db.filas.find((f) => f.id === id) ?? null;

  const manager: any = {
    create: (_entidad: unknown, datos: any) => ({ ...datos }),

    save: jest.fn(async (entidad: unknown, datos: any) => {
      if (entidad === ComprobantesC31) {
        datos.id = datos.id ?? ++db.seq;
        datos.beneficiarios = datos.beneficiarios ?? [];
        datos.preventivos = datos.preventivos ?? [];
        datos.devengados = datos.devengados ?? [];
        db.filas.push(datos);
        return datos;
      }
      if (entidad === C31Historial) {
        db.historial.push(datos);
        return datos;
      }
      if (entidad === C31Preventivo || entidad === C31Devengado) {
        const campo = entidad === C31Preventivo ? 'preventivos' : 'devengados';
        for (const item of datos as any[]) {
          porId(item.comprobante.id)?.[campo].push(item);
        }
        return datos;
      }
      return datos;
    }),

    findOne: async (entidad: unknown, opts: any) =>
      entidad === ComprobantesC31 ? porId(opts.where.id) : null,
    findOneOrFail: async (entidad: unknown, opts: any) => {
      const r = entidad === ComprobantesC31 ? porId(opts.where.id) : null;
      if (!r) throw new Error('EntityNotFound');
      return r;
    },

    update: jest.fn(async (entidad: unknown, criterio: any, datos: any) => {
      if (entidad === ComprobantesC31 && typeof criterio === 'number') {
        Object.assign(porId(criterio) ?? {}, datos);
      }
      if (entidad === C31Pago) {
        db.pagos
          .filter(
            (p) =>
              p.comprobanteId === criterio.comprobanteId &&
              p.estadoPago === criterio.estadoPago,
          )
          .forEach((p) => Object.assign(p, datos));
      }
    }),

    delete: async (entidad: unknown, criterio: any) => {
      const fila = porId(criterio.comprobante?.id);
      if (!fila) return;
      if (entidad === C31Preventivo) fila.preventivos = [];
      if (entidad === C31Devengado) fila.devengados = [];
    },

    countBy: async (entidad: unknown, where: any) => {
      if (entidad === C31CarpetasUbicacion)
        return db.ubicaciones[where.comprobante.id] ?? 0;
      if (entidad === C31Pago)
        return db.pagos.filter(
          (p) =>
            p.comprobanteId === where.comprobanteId &&
            p.estadoPago === where.estadoPago,
        ).length;
      if (entidad === ComprobantesC31)
        return db.filas.filter((f) => f.actaEntregaId === where.actaEntregaId)
          .length;
      return 0;
    },

    createQueryBuilder: (entidad: unknown) => {
      if (entidad === ComprobantesC31) return consultaUnicidad(db);
      // Consulta de "suma de pagos" (solo se usa al cambiar el monto)
      const qb: any = {
        select: () => qb,
        where: () => qb,
        andWhere: () => qb,
        getRawOne: async () => ({ suma: '0' }),
      };
      return qb;
    },
  };

  const repo = {
    findOne: async (opts: any) => porId(opts.where.id),
  };

  const dataSource = {
    manager,
    transaction: async (cb: (m: any) => Promise<unknown>) => cb(manager),
  };

  // Directorio de beneficiarios: aquí solo importa que no falle
  const beneficiarios = {
    nombresDe: jest.fn(async () => [] as string[]),
    catalogar: jest.fn(async () => new Map<string, number>()),
  };

  return { db, manager, repo, dataSource, beneficiarios };
}

/** Usuarios mínimos con el perfil (rol) que interesa en cada prueba. */
export const usuarioCon = (rol: string, id = 1): any => ({
  id,
  rol,
  rolActivo: rol,
});
