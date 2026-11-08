import PDFDocument from 'pdfkit';
import { Beneficiario } from './entities/beneficiario.entity';
import { FilterBeneficiariosDto } from './dto/filter-beneficiarios.dto';

const TIPO_DOC: Record<string, string> = {
  CI: 'CI',
  NIT: 'NIT',
  OTRO: 'Otro',
  SIN_DOCUMENTO: 'Sin documento',
};

/** Listado de beneficiarios (carta vertical) con el resumen de los filtros usados. */
export function beneficiariosPdf(
  filas: Beneficiario[],
  query: FilterBeneficiariosDto,
): Promise<Buffer> {
  const entidad =
    process.env.ENTIDAD_NOMBRE ?? 'GOBIERNO AUTÓNOMO MUNICIPAL DE SAN LUCAS';
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 50, bottom: 50, left: 40, right: 40 },
    bufferPages: true,
    info: { Title: 'Directorio de beneficiarios', Author: entidad },
  });
  const partes: Buffer[] = [];
  doc.on('data', (c: Buffer) => partes.push(c));

  const izq = doc.page.margins.left;
  const ancho = doc.page.width - izq - doc.page.margins.right;
  const limite = doc.page.height - doc.page.margins.bottom;

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(entidad, izq, 50, { width: ancho, align: 'center' });
  doc
    .fontSize(13)
    .text('DIRECTORIO DE BENEFICIARIOS', { width: ancho, align: 'center' });
  const filtros = [
    query.search && `Búsqueda: ${query.search}`,
    query.tipoPersona &&
      `Persona: ${query.tipoPersona === 'JURIDICA' ? 'Jurídica' : 'Natural'}`,
    query.tipoDocumento && `Documento: ${TIPO_DOC[query.tipoDocumento]}`,
    query.estado &&
      `Estado: ${query.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}`,
    query.gestion && `Con comprobantes en la gestión ${query.gestion}`,
  ].filter(Boolean) as string[];
  doc
    .font('Helvetica')
    .fontSize(9)
    .text(
      filtros.length
        ? `Filtros: ${filtros.join(' · ')}`
        : 'Sin filtros (todos los beneficiarios)',
      { width: ancho, align: 'center' },
    );
  doc.moveDown(0.8);

  const cols = [
    { t: 'Nombre / razón social', w: 0.4 },
    { t: 'Persona', w: 0.1 },
    { t: 'Documento', w: 0.2 },
    { t: 'Teléfono', w: 0.15 },
    { t: 'Estado', w: 0.15 },
  ];
  const x = (i: number) =>
    izq + cols.slice(0, i).reduce((a, c) => a + c.w * ancho, 0);

  const encabezado = () => {
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(8.5);
    cols.forEach((c, i) =>
      doc.text(c.t, x(i) + 2, y + 3, { width: c.w * ancho - 4 }),
    );
    doc.rect(izq, y, ancho, 16).stroke('#94a3b8');
    doc.y = y + 18;
  };
  encabezado();

  doc.font('Helvetica').fontSize(8.5);
  for (const f of filas) {
    const celdas = [
      f.nombre ?? '',
      f.tipoPersona === 'JURIDICA' ? 'Jurídica' : 'Natural',
      f.numeroDocumento
        ? `${TIPO_DOC[f.tipoDocumento ?? 'OTRO']} ${f.numeroDocumento}`
        : 'Sin documento',
      f.telefono ?? '—',
      f.estado === 'ACTIVO' ? 'Activo' : 'Inactivo',
    ];
    const alto =
      Math.max(
        ...celdas.map((t, i) =>
          doc.heightOfString(t, { width: cols[i].w * ancho - 4 }),
        ),
      ) + 6;
    if (doc.y + alto > limite) {
      doc.addPage();
      doc.y = doc.page.margins.top;
      encabezado();
      doc.font('Helvetica').fontSize(8.5);
    }
    const y = doc.y;
    celdas.forEach((t, i) =>
      doc.text(t, x(i) + 2, y + 3, { width: cols[i].w * ancho - 4 }),
    );
    doc
      .moveTo(izq, y + alto)
      .lineTo(izq + ancho, y + alto)
      .stroke('#e2e8f0');
    doc.y = y + alto;
  }
  doc.moveDown(0.6);
  if (doc.y + 14 <= limite) {
    doc
      .font('Helvetica-Bold')
      .text(`Total: ${filas.length} beneficiario(s)`, izq, doc.y);
  }

  // Numeración de páginas: se anula el margen inferior para que escribir en él
  // no cree una hoja adicional.
  const rango = doc.bufferedPageRange();
  for (let i = 0; i < rango.count; i++) {
    doc.switchToPage(rango.start + i);
    const inferior = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#64748b')
      .text(`Página ${i + 1} de ${rango.count}`, izq, doc.page.height - 30, {
        width: ancho,
        align: 'center',
        lineBreak: false,
      });
    doc.page.margins.bottom = inferior;
  }

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);
    doc.end();
  });
}
