import * as ExcelJS from 'exceljs';

/** Encabezados con el formato institucional que reconoce `campoDeEncabezado`. */
export const ENCABEZADOS_IMPORT = [
  'Nº PREV',
  'Nº DEV',
  'BENEFICIARIO',
  'DESCRIPCION',
  'MONTO',
  'FECHA',
  'Nº CARPETA',
] as const;

export type FilaExcel = Partial<
  Record<
    | 'prev'
    | 'dev'
    | 'beneficiario'
    | 'descripcion'
    | 'monto'
    | 'fecha'
    | 'carpeta',
    string | number
  >
>;

/**
 * Genera un .xlsx real en memoria (una hoja con encabezado en la fila 1;
 * los datos empiezan en la fila 2, que es el N° de fila que reporta el servicio).
 */
export async function crearExcel(
  filas: FilaExcel[],
  encabezados: readonly string[] = ENCABEZADOS_IMPORT,
  nombreHoja = 'Comprobantes',
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const hoja = wb.addWorksheet(nombreHoja);
  hoja.addRow([...encabezados]);
  for (const f of filas) {
    hoja.addRow([
      f.prev ?? '',
      f.dev ?? '',
      f.beneficiario ?? '',
      f.descripcion ?? '',
      f.monto ?? '',
      f.fecha ?? '',
      f.carpeta ?? '',
    ]);
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}
