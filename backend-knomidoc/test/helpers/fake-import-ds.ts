/**
 * DataSource falso para probar la importación masiva de Excel.
 *
 * Su `transaction()` reproduce la semántica real:
 *   - las escrituras de la fila quedan "pendientes" mientras corre el callback;
 *   - si el callback termina bien → se CONFIRMAN (`committed`);
 *   - si lanza una excepción → se DESCARTAN (rollback) y se relanza el error.
 *
 * Así se puede comprobar que cada fila es una transacción independiente y que
 * un fallo a mitad de fila no deja datos a medias.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Escritura {
  entidad: string;
  data: any;
}

const nombreDe = (entidad: unknown): string =>
  typeof entidad === 'function' ? entidad.name : String(entidad);

export class FakeImportDataSource {
  /** Escrituras confirmadas (solo de transacciones que terminaron bien). */
  committed: Escritura[] = [];
  transacciones = 0;
  rollbacks = 0;

  /** N° ya existentes en la base: clave `${gestion}:${numero}` */
  existentesPrev = new Set<string>();
  existentesDev = new Set<string>();

  /** Si devuelve true, el guardado de esa entidad lanza un error (fallo de BD simulado). */
  fallarSi?: (entidad: string, data: any) => boolean;

  private seq = 0;

  /** Consulta de duplicados del servicio: `SELECT 1 FROM c31_preventivos ...` */
  query = jest.fn(async (sql: string, params: [number, string]) => {
    const [gestion, numero] = params;
    const conjunto = sql.includes('c31_preventivos')
      ? this.existentesPrev
      : this.existentesDev;
    return conjunto.has(`${gestion}:${numero}`) ? [{ '?column?': 1 }] : [];
  });

  transaction = jest.fn(
    async (callback: (manager: any) => Promise<unknown>) => {
      this.transacciones++;
      const pendientes: Escritura[] = [];

      const manager = {
        create: (_entidad: unknown, datos: any) => ({ ...datos }),
        save: async (entidad: unknown, datos: any) => {
          const nombre = nombreDe(entidad);
          if (this.fallarSi?.(nombre, datos)) {
            throw new Error(`Fallo simulado de BD al guardar ${nombre}`);
          }
          const lista = Array.isArray(datos) ? datos : [datos];
          for (const d of lista) {
            if (d && typeof d === 'object' && d.id === undefined)
              d.id = ++this.seq;
            pendientes.push({ entidad: nombre, data: d });
          }
          return datos;
        },
        findOne: async () => null,
        update: async (entidad: unknown, _criterio: unknown, datos: any) => {
          pendientes.push({
            entidad: `${nombreDe(entidad)}#update`,
            data: datos,
          });
        },
      };

      try {
        const resultado = await callback(manager);
        this.committed.push(...pendientes); // COMMIT
        return resultado;
      } catch (error) {
        this.rollbacks++; // ROLLBACK: `pendientes` se descarta
        throw error;
      }
    },
  );

  /** N° de preventivo de los comprobantes realmente confirmados. */
  preventivosGuardados(): string[] {
    return this.committed
      .filter((e) => e.entidad === 'ComprobantesC31')
      .flatMap((e) =>
        (e.data.preventivos ?? []).map((p: any) => p.numeroPreventivo),
      );
  }
}
