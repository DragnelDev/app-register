/**
 * Integración: POST /api/v1/comprobantes-c31/import
 *
 * Se levanta el controlador y el ComprobantesC31Service REALES (con la cadena de
 * guards real y un JWT real), y se envía un .xlsx auténtico (generado con
 * exceljs) por multipart con Supertest. Solo la base de datos es un doble:
 * FakeImportDataSource, que reproduce COMMIT / ROLLBACK por transacción.
 *
 * Lo que se demuestra: la importación es transaccional POR FILA.
 *  - Una fila con error de validación no impide importar las demás.
 *  - Una fila que falla A MITAD de su transacción (ya había guardado el
 *    comprobante y falla al guardar la carpeta) se revierte completa y las
 *    filas siguientes se siguen importando.
 *  - Duplicados (en el archivo o en la base) se omiten sin error.
 */
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { ComprobantesC31Controller } from '../src/comprobantes_c31/comprobantes_c31.controller';
import { ComprobantesC31Service } from '../src/comprobantes_c31/comprobantes_c31.service';
import { C31SeguimientoService } from '../src/comprobantes_c31/c31-seguimiento.service';
import { ComprobantesC31 } from '../src/comprobantes_c31/entities/comprobantes_c31.entity';
import { BeneficiariosService } from '../src/beneficiarios/beneficiarios.service';
import { crearAppPruebas, mockServicio } from './helpers/auth-app';
import { crearExcel } from './helpers/excel';
import { FakeImportDataSource } from './helpers/fake-import-ds';

const XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const URL_IMPORT = '/api/v1/comprobantes-c31/import';

describe('POST /comprobantes-c31/import (integración)', () => {
  let app: INestApplication;
  let tokenPara: (rol: string) => string;
  let ds: FakeImportDataSource;

  beforeEach(async () => {
    ds = new FakeImportDataSource();
    // Fallo de BD simulado SOLO al crear la carpeta 2026-777 (a mitad de la fila)
    ds.fallarSi = (entidad, data) =>
      entidad === 'Carpeta' && data.codigoCarpeta === '2026-777';
    ds.existentesPrev.add('2026:50'); // el PREV 50 ya existe en la gestión 2026

    ({ app, tokenPara } = await crearAppPruebas({
      controllers: [ComprobantesC31Controller],
      providers: [
        ComprobantesC31Service,
        { provide: C31SeguimientoService, useValue: mockServicio() },
        { provide: getRepositoryToken(ComprobantesC31), useValue: {} },
        { provide: DataSource, useValue: ds },
        {
          provide: BeneficiariosService,
          useValue: { catalogar: jest.fn(async () => new Map()) },
        },
      ],
    }));
  });

  afterEach(async () => {
    await app.close();
  });

  const importar = (
    excel: Buffer,
    { gestion = '2026', simular = false, rol = 'ADMIN' } = {},
  ) =>
    request(app.getHttpServer())
      .post(`${URL_IMPORT}${simular ? '?simular=1' : ''}`)
      .set('Authorization', `Bearer ${tokenPara(rol)}`)
      .field('gestion', gestion)
      .attach('file', excel, { filename: 'import.xlsx', contentType: XLSX });

  /** Las filas del Excel empiezan en la fila 2 (la 1 es el encabezado). */
  const excelMixto = () =>
    crearExcel([
      /* fila 2 */ {
        prev: '101',
        beneficiario: 'ACME SRL',
        descripcion: 'Pago de agua',
        monto: '1.500,50',
        fecha: '15/03/2026',
      },
      /* fila 3 */ {
        prev: '102',
        beneficiario: 'ACME SRL',
        descripcion: 'Monto roto',
        monto: 'abc',
        fecha: '16/03/2026',
      },
      /* fila 4 */ {
        prev: '103',
        beneficiario: 'ACME SRL',
        descripcion: 'Falla a mitad de fila',
        monto: 200,
        fecha: '17/03/2026',
        carpeta: '777',
      },
      /* fila 5 */ {
        prev: '104',
        beneficiario: 'LUZ SA',
        descripcion: 'Pago de luz',
        monto: 300,
      },
      /* fila 6 */ {
        prev: '101',
        beneficiario: 'ACME SRL',
        descripcion: 'Repetida en el archivo',
        monto: 10,
        fecha: '18/03/2026',
      },
      /* fila 7 */ {
        prev: '50',
        beneficiario: 'ACME SRL',
        descripcion: 'Ya existe en la base',
        monto: 10,
        fecha: '18/03/2026',
      },
      /* fila 8 */ {
        beneficiario: 'ACME SRL',
        descripcion: 'Sin PREV ni DEV',
        monto: 100,
        fecha: '19/03/2026',
      },
    ]);

  it('importa las filas buenas aunque otras fallen (transaccionalidad por fila)', async () => {
    const res = await importar(await excelMixto());

    expect(res.status).toBe(201);
    expect(res.body.simulacion).toBe(false);
    expect(res.body.total).toBe(7);
    expect(res.body.creados).toBe(2); // filas 2 y 5

    // Errores: validación (3 y 8) + fallo de BD (4)
    expect(res.body.errores.map((e: { fila: number }) => e.fila)).toEqual([
      3, 4, 8,
    ]);
    expect(res.body.errores[0].motivo).toMatch(
      /monto "abc" no es un número válido/,
    );
    expect(res.body.errores[1].motivo).toMatch(/Fallo simulado de BD/);
    expect(res.body.errores[2].motivo).toMatch(
      /Falta el Nº de preventivo o de devengado/,
    );

    // Duplicados: se OMITEN (no son error)
    expect(res.body.omitidos.map((o: { fila: number }) => o.fila)).toEqual([
      6, 7,
    ]);
    expect(res.body.omitidos[0].motivo).toMatch(/PREV 101/);
    expect(res.body.omitidos[1].motivo).toMatch(/PREV 50/);
  });

  it('cada fila válida abre SU PROPIA transacción y la fila que falla se revierte entera', async () => {
    await importar(await excelMixto());

    // Transacciones: filas 2, 4 y 5 (las demás se descartan antes de tocar la BD)
    expect(ds.transacciones).toBe(3);
    expect(ds.rollbacks).toBe(1);

    // La fila 4 ya había guardado el comprobante (PREV 103) cuando falló la
    // carpeta: NADA de eso puede quedar confirmado.
    expect(ds.preventivosGuardados()).toEqual(['101', '104']);
    expect(ds.preventivosGuardados()).not.toContain('103');
    expect(ds.committed.some((e) => e.entidad === 'Carpeta')).toBe(false);
  });

  it('las filas confirmadas dejan comprobante + historial de estados', async () => {
    await importar(await excelMixto());

    const comprobantes = ds.committed.filter(
      (e) => e.entidad === 'ComprobantesC31',
    );
    const historial = ds.committed.filter((e) => e.entidad === 'C31Historial');
    expect(comprobantes).toHaveLength(2);
    expect(historial).toHaveLength(2);
    expect(
      historial.every((h) => h.data.detalle === 'Importado desde Excel'),
    ).toBe(true);
    expect(comprobantes[0].data).toMatchObject({
      gestion: 2026,
      montoTotal: 1500.5, // "1.500,50" (formato boliviano) interpretado bien
      tipoC31: 'CON_IMPUTACION',
    });
  });

  it('un fallo de BD en una fila NO aborta el resto: la fila posterior sí se importa', async () => {
    const res = await importar(await excelMixto());

    const fila5 = res.body.filas.find((f: { fila: number }) => f.fila === 5);
    expect(fila5.estado).toBe('OK');
    expect(fila5.advertencias).toContain(
      'Sin fecha: se usó el 01/01 de la gestión',
    );
    expect(ds.preventivosGuardados()).toContain('104');
  });

  it('modo simulación: valida y reporta fila por fila SIN guardar nada', async () => {
    const res = await importar(await excelMixto(), { simular: true });

    expect(res.status).toBe(201);
    expect(res.body.simulacion).toBe(true);
    expect(res.body.creados).toBe(0);
    expect(ds.transacciones).toBe(0);
    expect(ds.committed).toHaveLength(0);

    // Vista previa: 101, 103 y 104 "se crearían"; 102 y 8 son error; 101 bis y 50 duplicados
    expect(res.body.porCrear).toBe(3);
    expect(res.body.errores.map((e: { fila: number }) => e.fila)).toEqual([
      3, 8,
    ]);
    expect(res.body.omitidos).toHaveLength(2);
  });

  it('reimportar el mismo archivo es seguro: lo ya cargado se omite como duplicado', async () => {
    const excel = await crearExcel([
      {
        prev: '300',
        beneficiario: 'X',
        descripcion: 'Uno',
        monto: 10,
        fecha: '01/02/2026',
      },
    ]);
    await importar(excel);
    // Lo que se confirmó pasa a "existir" en la base
    ds.preventivosGuardados().forEach((n) =>
      ds.existentesPrev.add(`2026:${n}`),
    );

    const res = await importar(excel);

    expect(res.body.creados).toBe(0);
    expect(res.body.omitidos).toHaveLength(1);
    expect(ds.preventivosGuardados()).toEqual(['300']); // sin duplicar
  });

  it('un devengado sin preventivo se importa como SIN_IMPUTACION', async () => {
    const res = await importar(
      await crearExcel([
        {
          dev: '45',
          beneficiario: 'X',
          descripcion: 'Gasto sin imputación',
          monto: 99,
          fecha: '01/02/2026',
        },
      ]),
    );

    expect(res.body.creados).toBe(1);
    const c = ds.committed.find((e) => e.entidad === 'ComprobantesC31');
    expect(c?.data.tipoC31).toBe('SIN_IMPUTACION');
    expect(c?.data.devengados[0].numeroDevengado).toBe('45');
  });

  describe('validaciones del endpoint', () => {
    it('sin archivo → 400', async () => {
      const res = await request(app.getHttpServer())
        .post(URL_IMPORT)
        .set('Authorization', `Bearer ${tokenPara('ADMIN')}`)
        .field('gestion', '2026');
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/No se envió ningún archivo/);
    });

    it.each([['abc'], ['1999'], ['2101'], ['20.5'], ['']])(
      'gestión inválida (%p) → 400',
      async (gestion) => {
        const res = await importar(await excelMixto(), { gestion });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/gestión indicada no es válida/);
        expect(ds.transacciones).toBe(0);
      },
    );

    it('Excel sin las columnas esperadas → 400 y sin escrituras', async () => {
      const excel = await crearExcel([], ['Col A', 'Col B', 'Col C']);
      const res = await importar(excel);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(
        /No se encontró ninguna hoja con encabezados/,
      );
      expect(ds.committed).toHaveLength(0);
    });

    it('reconoce las columnas aunque vengan en otro orden y en minúsculas', async () => {
      const excel = await crearExcel(
        [],
        ['monto', 'descripcion', 'beneficiario', 'n° prev'],
      );
      // Solo encabezado: hoja válida pero sin filas → 0 creados, sin error
      const res = await importar(excel);
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ total: 0, creados: 0 });
    });

    // HALLAZGO esperado: la detección de la fila de encabezado hace solo
    // toUpperCase() (sin quitar tildes), así que "Descripción" → "DESCRIPCIÓN" no
    // contiene "DESCRIPCION" y la hoja se descarta. campoDeEncabezado() sí
    // normaliza tildes; la detección debería usar normalizarEncabezado() también.
    it('reconoce el encabezado "Descripción" con tilde (como se escribe en español)', async () => {
      const excel = await crearExcel(
        [],
        ['N° Prev', 'Beneficiario', 'Descripción', 'Monto'],
      );
      const res = await importar(excel);
      expect(res.status).toBe(201);
    });

    // HALLAZGO esperado: hoy exceljs lanza al abrir un archivo que no es .xlsx y
    // el servicio no lo captura → 500. Debe responder 400 con un mensaje claro.
    it('un archivo que NO es Excel (texto/exe renombrado) → 400, no 500', async () => {
      const res = await request(app.getHttpServer())
        .post(URL_IMPORT)
        .set('Authorization', `Bearer ${tokenPara('ADMIN')}`)
        .field('gestion', '2026')
        .attach('file', Buffer.from('MZ esto no es un excel'), {
          filename: 'virus.xlsx',
          contentType: XLSX,
        });
      expect(res.status).toBe(400);
    });
  });
});
