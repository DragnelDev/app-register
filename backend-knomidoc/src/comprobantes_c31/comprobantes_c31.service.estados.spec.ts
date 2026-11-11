/**
 * Máquina de estados del comprobante (ComprobantesC31Service.cambiarEstado).
 *
 * Tres capas:
 *  1. CONTRATO: la matriz de TRANSICIONES_MANUALES coincide con la matriz
 *     escrita aquí a mano. Si alguien cambia una regla de negocio, este test
 *     falla a propósito y obliga a actualizarlo de forma consciente.
 *  2. EXHAUSTIVO: se ejecutan las 8 × 6 combinaciones contra el servicio.
 *  3. REGLAS CRÍTICAS con mensajes: anulado es terminal, archivar exige folio y
 *     ubicación, motivos obligatorios, pagos efectuados, remitente, etc.
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ComprobantesC31Service } from './comprobantes_c31.service';
import {
  EstadoFisicoC31 as E,
  ESTADOS_FISICO_C31,
  TRANSICIONES_MANUALES,
  UBICACION_ARCHIVO_DEFAULT,
} from './entities/comprobantes_c31.entity';
import { ESTADOS_SOLICITABLES } from './dto/cambiar-estado-comprobantes_c31.dto';
import { crearFakeC31Db, usuarioCon } from '../../test/helpers/fake-c31-db';

/** Matriz esperada, escrita a mano (no se deriva del código bajo prueba). */
const MATRIZ_ESPERADA: Record<string, string[]> = {
  EN_TRAMITE: ['EN_REVISION', 'OBSERVADO', 'ANULADO'],
  EN_REVISION: ['EN_TRAMITE', 'OBSERVADO', 'ANULADO'],
  OBSERVADO: ['EN_TRAMITE', 'EN_REVISION', 'ANULADO'],
  EN_ARCHIVO: ['ARCHIVADO', 'NO_ENCONTRADO', 'OBSERVADO', 'ANULADO'],
  ARCHIVADO: ['NO_ENCONTRADO', 'OBSERVADO', 'ANULADO'],
  PRESTADO: [],
  ANULADO: [],
  NO_ENCONTRADO: ['ARCHIVADO', 'OBSERVADO', 'ANULADO'],
};

describe('ComprobantesC31Service · cambiarEstado (FSM)', () => {
  let ctx: ReturnType<typeof crearFakeC31Db>;
  let service: ComprobantesC31Service;
  const admin = usuarioCon('ADMIN');

  beforeEach(() => {
    ctx = crearFakeC31Db();
    service = new ComprobantesC31Service(
      ctx.repo as any,
      ctx.dataSource as any,
      ctx.beneficiarios as any,
    );
  });

  /** Comprobante completo, foliado y ubicado: cumple todas las precondiciones. */
  const sembrar = (sobrescribir: Record<string, unknown> = {}) => {
    const f = {
      id: ++ctx.db.seq,
      gestion: 2026,
      estadoFisico: E.EN_TRAMITE,
      montoTotal: 100,
      fechaElaboracion: new Date('2026-03-01'),
      descripcion: 'Pago de servicios',
      beneficiarios: [{ id: 1, nombreBeneficiario: 'ACME' }],
      numeroFolio: '15',
      ubicacionFisica: 'Estante 3 / Caja 2',
      actaEntregaId: null,
      preventivos: [{ numeroPreventivo: '1' }],
      devengados: [],
      ...sobrescribir,
    };
    ctx.db.filas.push(f);
    return f;
  };

  const cambiar = (
    id: number,
    estado: string,
    motivo?: string,
    usuario = admin,
  ) => service.cambiarEstado(id, { estado, motivo } as any, usuario);

  describe('contrato de la matriz', () => {
    it('TRANSICIONES_MANUALES coincide con las reglas de negocio acordadas', () => {
      expect(TRANSICIONES_MANUALES).toEqual(MATRIZ_ESPERADA);
    });

    it('cubre todos los estados existentes', () => {
      expect(Object.keys(TRANSICIONES_MANUALES).sort()).toEqual(
        [...ESTADOS_FISICO_C31].sort(),
      );
    });

    it('"En archivo" y "Prestado" nunca se piden a mano (los fija el sistema)', () => {
      expect(ESTADOS_SOLICITABLES).not.toContain('EN_ARCHIVO');
      expect(ESTADOS_SOLICITABLES).not.toContain('PRESTADO');
      for (const lista of Object.values(TRANSICIONES_MANUALES)) {
        expect(lista).not.toContain(E.EN_ARCHIVO);
        expect(lista).not.toContain(E.PRESTADO);
      }
    });
  });

  describe('exhaustivo: todas las combinaciones estado actual → nuevo', () => {
    const combinaciones = ESTADOS_FISICO_C31.flatMap((actual) =>
      ESTADOS_SOLICITABLES.map((nuevo) => [actual, nuevo] as const),
    );

    it.each(combinaciones)('%s → %s', async (actual, nuevo) => {
      const f = sembrar({ estadoFisico: actual });
      const permitido =
        actual !== nuevo && MATRIZ_ESPERADA[actual].includes(nuevo);

      const resultado = cambiar(f.id, nuevo, 'Motivo de prueba');

      if (permitido) {
        await expect(resultado).resolves.toMatchObject({ estadoFisico: nuevo });
        expect(ctx.db.historial).toHaveLength(1);
        expect(ctx.db.historial[0]).toMatchObject({
          estadoAnterior: actual,
          estadoNuevo: nuevo,
          origen: 'MANUAL',
        });
      } else {
        await expect(resultado).rejects.toThrow(
          actual === nuevo ? BadRequestException : ConflictException,
        );
        // Una transición rechazada no cambia nada ni deja historial
        expect(f.estadoFisico).toBe(actual);
        expect(ctx.db.historial).toHaveLength(0);
      }
    });
  });

  describe('transiciones prohibidas (con su mensaje)', () => {
    it('ANULADO → EN_TRAMITE: un anulado ya no cambia de estado', async () => {
      const f = sembrar({ estadoFisico: E.ANULADO });
      await expect(cambiar(f.id, 'EN_TRAMITE')).rejects.toThrow(
        /anulado ya no cambia de estado/,
      );
    });

    it('ANULADO no puede pasar a ningún estado', async () => {
      for (const nuevo of ESTADOS_SOLICITABLES) {
        const f = sembrar({ estadoFisico: E.ANULADO });
        await expect(cambiar(f.id, nuevo, 'x')).rejects.toThrow();
        expect(f.estadoFisico).toBe(E.ANULADO);
      }
    });

    it('PRESTADO: primero hay que registrar la devolución', async () => {
      const f = sembrar({ estadoFisico: E.PRESTADO });
      await expect(cambiar(f.id, 'ARCHIVADO')).rejects.toThrow(
        /devolución del préstamo/,
      );
    });

    it('EN_REVISION → ARCHIVADO se salta el ingreso a archivo (409)', async () => {
      const f = sembrar({ estadoFisico: E.EN_REVISION });
      await expect(cambiar(f.id, 'ARCHIVADO')).rejects.toThrow(
        ConflictException,
      );
    });

    it('pedir el mismo estado en el que ya está es 400', async () => {
      const f = sembrar({ estadoFisico: E.EN_REVISION });
      await expect(cambiar(f.id, 'EN_REVISION')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('comprobante inexistente → 404', async () => {
      await expect(cambiar(999, 'OBSERVADO', 'x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('archivar exige N° de folio y ubicación final', () => {
    const MSG = /N° de folio y su ubicación final/;

    it('sin folio → 409', async () => {
      const f = sembrar({ estadoFisico: E.EN_ARCHIVO, numeroFolio: null });
      await expect(cambiar(f.id, 'ARCHIVADO')).rejects.toThrow(MSG);
      expect(f.estadoFisico).toBe(E.EN_ARCHIVO);
    });

    it('folio en blanco ("   ") cuenta como sin folio', async () => {
      const f = sembrar({ estadoFisico: E.EN_ARCHIVO, numeroFolio: '   ' });
      await expect(cambiar(f.id, 'ARCHIVADO')).rejects.toThrow(MSG);
    });

    it('con folio pero ubicación genérica de recepción ("ARCHIVOS GAMSL") → 409', async () => {
      const f = sembrar({
        estadoFisico: E.EN_ARCHIVO,
        ubicacionFisica: UBICACION_ARCHIVO_DEFAULT,
      });
      await expect(cambiar(f.id, 'ARCHIVADO')).rejects.toThrow(MSG);
    });

    it('con folio y sin ubicación alguna → 409', async () => {
      const f = sembrar({ estadoFisico: E.EN_ARCHIVO, ubicacionFisica: null });
      await expect(cambiar(f.id, 'ARCHIVADO')).rejects.toThrow(MSG);
    });

    it('con folio y ubicación textual → se archiva', async () => {
      const f = sembrar({ estadoFisico: E.EN_ARCHIVO });
      await expect(cambiar(f.id, 'ARCHIVADO')).resolves.toMatchObject({
        estadoFisico: E.ARCHIVADO,
      });
    });

    it('con folio y ubicada en una carpeta (aunque la ubicación sea genérica) → se archiva', async () => {
      const f = sembrar({
        estadoFisico: E.EN_ARCHIVO,
        ubicacionFisica: UBICACION_ARCHIVO_DEFAULT,
      });
      ctx.db.ubicaciones[f.id] = 1;
      await expect(cambiar(f.id, 'ARCHIVADO')).resolves.toMatchObject({
        estadoFisico: E.ARCHIVADO,
      });
    });

    it('un "no encontrado" que aparece también necesita folio y ubicación', async () => {
      const f = sembrar({ estadoFisico: E.NO_ENCONTRADO, numeroFolio: null });
      await expect(cambiar(f.id, 'ARCHIVADO')).rejects.toThrow(MSG);
    });
  });

  describe('motivo obligatorio', () => {
    it.each([['OBSERVADO'], ['NO_ENCONTRADO'], ['ANULADO']])(
      '%s sin motivo → 400',
      async (nuevo) => {
        const f = sembrar({ estadoFisico: E.EN_ARCHIVO });
        await expect(cambiar(f.id, nuevo, undefined)).rejects.toThrow(
          BadRequestException,
        );
        await expect(cambiar(f.id, nuevo, '')).rejects.toThrow(
          BadRequestException,
        );
        expect(f.estadoFisico).toBe(E.EN_ARCHIVO);
      },
    );

    it('el motivo queda en observaciones y en el historial', async () => {
      const f = sembrar({ estadoFisico: E.EN_REVISION });
      await cambiar(f.id, 'OBSERVADO', '  Falta firma del Director  ');

      expect(f.observaciones).toBe('Falta firma del Director');
      expect(ctx.db.historial[0].detalle).toBe('Falta firma del Director');
    });
  });

  describe('pasar a "En revisión / firmado" exige los datos completos', () => {
    it.each([
      ['monto en 0', { montoTotal: 0 }],
      ['sin fecha', { fechaElaboracion: null }],
      ['sin glosa', { descripcion: '  ' }],
      ['sin beneficiarios', { beneficiarios: [] }],
    ])('%s → 409', async (_caso, faltante) => {
      const f = sembrar({ estadoFisico: E.EN_TRAMITE, ...faltante });
      await expect(cambiar(f.id, 'EN_REVISION')).rejects.toThrow(
        ConflictException,
      );
      expect(f.estadoFisico).toBe(E.EN_TRAMITE);
    });
  });

  describe('anulación y pagos', () => {
    it('con pagos EFECTUADOS no se puede anular (409)', async () => {
      const f = sembrar({ estadoFisico: E.EN_REVISION });
      ctx.db.pagos.push({ comprobanteId: f.id, estadoPago: 'PAGADO' });

      await expect(
        cambiar(f.id, 'ANULADO', 'Error de registro'),
      ).rejects.toThrow(/pagos efectuados/);
      expect(f.estadoFisico).toBe(E.EN_REVISION);
    });

    it('al anular, los pagos PENDIENTES quedan anulados con él', async () => {
      const f = sembrar({ estadoFisico: E.EN_REVISION });
      ctx.db.pagos.push(
        { comprobanteId: f.id, estadoPago: 'PENDIENTE' },
        { comprobanteId: f.id, estadoPago: 'PENDIENTE' },
      );

      await cambiar(f.id, 'ANULADO', 'Duplicado en SIGEP');

      expect(ctx.db.pagos.every((p) => p.estadoPago === 'ANULADO')).toBe(true);
      expect(f.observaciones).toBe('Anulado: Duplicado en SIGEP');
    });
  });

  describe('salir del archivo', () => {
    it('EN_ARCHIVO → OBSERVADO lo desvincula de su acta de entrega', async () => {
      const f = sembrar({ estadoFisico: E.EN_ARCHIVO, actaEntregaId: 7 });
      await cambiar(f.id, 'OBSERVADO', 'Falta sello');
      expect(f.actaEntregaId).toBeNull();
    });

    it('un cambio que no sale del archivo conserva el acta', async () => {
      const f = sembrar({ estadoFisico: E.EN_ARCHIVO, actaEntregaId: 7 });
      await cambiar(f.id, 'ARCHIVADO');
      expect(f.actaEntregaId).toBe(7);
    });
  });

  describe('perfil REMITENTE_C31', () => {
    const remitente = usuarioCon('REMITENTE_C31', 5);

    it('puede ir entre "En trámite" y "En revisión / firmado"', async () => {
      const f = sembrar({ estadoFisico: E.EN_TRAMITE });
      await expect(
        cambiar(f.id, 'EN_REVISION', undefined, remitente),
      ).resolves.toMatchObject({ estadoFisico: E.EN_REVISION });
    });

    it.each([['OBSERVADO'], ['ANULADO']])(
      'no puede pasar a %s (403)',
      async (nuevo) => {
        const f = sembrar({ estadoFisico: E.EN_TRAMITE });
        await expect(cambiar(f.id, nuevo, 'motivo', remitente)).rejects.toThrow(
          ForbiddenException,
        );
        expect(f.estadoFisico).toBe(E.EN_TRAMITE);
      },
    );

    it('no toca comprobantes que ya pasaron de "Firmado" (403)', async () => {
      const f = sembrar({ estadoFisico: E.EN_ARCHIVO });
      await expect(
        cambiar(f.id, 'EN_TRAMITE', undefined, remitente),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
