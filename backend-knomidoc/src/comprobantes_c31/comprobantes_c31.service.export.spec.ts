import * as ExcelJS from 'exceljs';
import { ComprobantesC31Service } from './comprobantes_c31.service';

describe('ComprobantesC31Service · exportExcel', () => {
  it('exporta por separado los números de carpeta y la ubicación física', async () => {
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 1 }]),
    };
    const repo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 1,
          preventivos: [{ numeroPreventivo: '20' }],
          devengados: [],
          pagos: [],
          beneficiarios: [{ nombreBeneficiario: 'ACME' }],
          descripcion: 'Pago de prueba',
          montoTotal: 125,
          fechaElaboracion: '2026-03-15',
          numeroFolio: '10',
          ubicacionFisica: 'ARCHIVOS CENTRAL GAMSL',
          carpetasUbicacion: [{ carpeta: { codigoCarpeta: '2026-CI-004' } }],
        },
      ]),
    };
    const service = new ComprobantesC31Service(
      repo as never,
      {} as never,
      {} as never,
    );
    jest
      .spyOn(service as never, 'construirConsultaFiltrada')
      .mockReturnValue(queryBuilder as never);

    const buffer = await service.exportExcel({});
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const worksheet = workbook.getWorksheet('Comprobantes');

    expect(worksheet?.getCell(2, 9).value).toBe('Nº CARPETA');
    expect(worksheet?.getCell(2, 10).value).toBe('UBICACIÓN FÍSICA');
    expect(worksheet?.getCell(3, 9).value).toBe('004');
    expect(worksheet?.getCell(3, 10).value).toBe('ARCHIVOS CENTRAL GAMSL');
  });
});
