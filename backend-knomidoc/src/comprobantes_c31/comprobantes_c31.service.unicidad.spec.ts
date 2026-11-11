/**
 * Aislamiento por gestión y unicidad de identificadores (ComprobantesC31Service).
 *
 * Regla de negocio real del sistema (validarIdentificadoresUnicos):
 *   - Cada N° de PREVENTIVO es único dentro de una GESTIÓN.
 *   - Cada N° de DEVENGADO es único dentro de una GESTIÓN (correlativo propio).
 *   - La comparación ignora mayúsculas/minúsculas.
 *   - Un comprobante ANULADO libera su número.
 *   - El mismo N° puede existir en gestiones distintas.
 *
 * NOTA: el modelo no tiene un campo `tipo_gasto`. El "tipo" es `tipoC31`
 * (CON_IMPUTACION si lleva preventivo, SIN_IMPUTACION si solo lleva devengado)
 * y se DERIVA del identificador, por eso la unicidad efectiva es
 * (gestión + tipo de identificador + número).
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ComprobantesC31Service } from './comprobantes_c31.service';
import { EstadoFisicoC31, TipoC31 } from './entities/comprobantes_c31.entity';
import { crearFakeC31Db, usuarioCon } from '../../test/helpers/fake-c31-db';

describe('ComprobantesC31Service · unicidad por gestión', () => {
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

  const crearPrev = (numero: string, gestion = 2026) =>
    service.create({ numeroPreventivo: numero, gestion } as any, admin);
  const crearDev = (numero: string, gestion = 2026) =>
    service.create({ numeroDevengado: numero, gestion } as any, admin);

  describe('create()', () => {
    it('registra un preventivo nuevo y lo deja "En trámite" con tipo CON_IMPUTACION', async () => {
      const c = await crearPrev('8');

      expect(c.gestion).toBe(2026);
      expect(c.tipoC31).toBe(TipoC31.CON_IMPUTACION);
      expect(c.estadoFisico).toBe(EstadoFisicoC31.EN_TRAMITE);
      expect(ctx.db.filas).toHaveLength(1);
    });

    it('RECHAZA un preventivo repetido en la misma gestión (409)', async () => {
      await crearPrev('8', 2026);

      await expect(crearPrev('8', 2026)).rejects.toThrow(ConflictException);
      await expect(crearPrev('8', 2026)).rejects.toThrow(
        /preventivo 8 en la gestión 2026/,
      );
      // El duplicado no se persistió
      expect(ctx.db.filas).toHaveLength(1);
      expect(ctx.db.historial).toHaveLength(1);
    });

    it('PERMITE el mismo número en gestiones distintas', async () => {
      const a = await crearPrev('8', 2026);
      const b = await crearPrev('8', 2027);

      expect(a.gestion).toBe(2026);
      expect(b.gestion).toBe(2027);
      expect(ctx.db.filas).toHaveLength(2);
    });

    it('compara sin distinguir mayúsculas ("a-15" choca con "A-15")', async () => {
      await crearPrev('A-15');
      await expect(crearPrev('a-15')).rejects.toThrow(ConflictException);
    });

    it('ignora espacios sobrantes al normalizar el número', async () => {
      await crearPrev('20');
      await expect(crearPrev('  20  ')).rejects.toThrow(ConflictException);
    });

    it('el devengado tiene su propio correlativo: PREV 8 y DEV 8 conviven', async () => {
      const prev = await crearPrev('8');
      const dev = await crearDev('8');

      expect(prev.tipoC31).toBe(TipoC31.CON_IMPUTACION);
      expect(dev.tipoC31).toBe(TipoC31.SIN_IMPUTACION);
      expect(ctx.db.filas).toHaveLength(2);
    });

    it('rechaza un devengado repetido en la misma gestión pero no en otra', async () => {
      await crearDev('5', 2026);

      await expect(crearDev('5', 2026)).rejects.toThrow(
        /devengado 5 en la gestión 2026/,
      );
      await expect(crearDev('5', 2027)).resolves.toBeDefined();
    });

    it('un comprobante ANULADO libera su número para reutilizarlo', async () => {
      const original = await crearPrev('8');
      await expect(crearPrev('8')).rejects.toThrow(ConflictException);

      original.estadoFisico = EstadoFisicoC31.ANULADO;

      await expect(crearPrev('8')).resolves.toBeDefined();
      expect(ctx.db.filas).toHaveLength(2);
    });

    it('deduce la gestión de la fecha de elaboración cuando no se envía', async () => {
      const c = await service.create(
        { numeroPreventivo: '1', fechaElaboracion: '2025-06-10' } as any,
        admin,
      );
      expect(c.gestion).toBe(2025);
    });

    it('exige al menos un N° de preventivo o devengado (400)', async () => {
      await expect(
        service.create({ gestion: 2026 } as any, admin),
      ).rejects.toThrow(BadRequestException);
    });

    it('no admite varios N° en el alta: se deben unir después (400)', async () => {
      await expect(
        service.create(
          { preventivos: ['1', '2'], gestion: 2026 } as any,
          admin,
        ),
      ).rejects.toThrow(/Unir comprobantes/);
      await expect(
        service.create(
          { numeroPreventivo: '1', numeroDevengado: '1', gestion: 2026 } as any,
          admin,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(ctx.db.filas).toHaveLength(0);
    });

    it('el remitente no puede fijar folio ni ubicación física (403)', async () => {
      await expect(
        service.create(
          { numeroPreventivo: '9', gestion: 2026, numeroFolio: '33' } as any,
          usuarioCon('REMITENTE_C31', 5),
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(ctx.db.filas).toHaveLength(0);
    });
  });

  describe('update()', () => {
    it('rechaza cambiar el preventivo por uno que ya usa OTRO comprobante de la gestión', async () => {
      const a = await crearPrev('8');
      await crearPrev('9');

      await expect(
        service.update(a.id as number, { numeroPreventivo: '9' } as any, admin),
      ).rejects.toThrow(/preventivo 9 en la gestión 2026/);
    });

    it('permite "guardar" el propio número (se excluye a sí mismo de la búsqueda)', async () => {
      const a = await crearPrev('8');

      await expect(
        service.update(a.id as number, { numeroPreventivo: '8' } as any, admin),
      ).resolves.toBeDefined();
    });

    it('rechaza mover el comprobante a una gestión donde ese N° ya existe', async () => {
      const a = await crearPrev('8', 2026);
      await crearPrev('8', 2027);

      await expect(
        service.update(a.id as number, { gestion: 2027 } as any, admin),
      ).rejects.toThrow(/gestión 2027/);
    });

    it('permite moverlo a una gestión donde el N° está libre', async () => {
      const a = await crearPrev('8', 2026);

      const r = await service.update(
        a.id as number,
        { gestion: 2028 } as any,
        admin,
      );

      expect(r.gestion).toBe(2028);
    });

    it('no modifica un comprobante anulado (409)', async () => {
      const a = await crearPrev('8');
      a.estadoFisico = EstadoFisicoC31.ANULADO;

      await expect(
        service.update(a.id as number, { observaciones: 'x' } as any, admin),
      ).rejects.toThrow(/anulado no se puede modificar/);
    });

    it('un comprobante ARCHIVADO exige motivo de modificación (≥ 5 caracteres)', async () => {
      const a = await crearPrev('8');
      a.estadoFisico = EstadoFisicoC31.ARCHIVADO;

      await expect(
        service.update(a.id as number, { observaciones: 'x' } as any, admin),
      ).rejects.toThrow(/motivo de la modificación/);

      await expect(
        service.update(
          a.id as number,
          {
            observaciones: 'x',
            motivoModificacion: 'Corrección de glosa',
          } as any,
          admin,
        ),
      ).resolves.toBeDefined();
      // Queda constancia en el historial
      expect(ctx.db.historial.at(-1)).toMatchObject({
        origen: 'MODIFICACION',
        detalle: expect.stringContaining('Corrección de glosa'),
      });
    });
  });
});
