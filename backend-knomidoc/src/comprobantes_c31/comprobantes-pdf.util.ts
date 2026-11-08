import PDFDocument from 'pdfkit';
import {
  ComprobantesC31,
  ESTADO_FISICO_LABELS,
  EstadoFisicoC31,
} from './entities/comprobantes_c31.entity';
import {
  devengadosDe,
  preventivosDe,
  rotuloC31,
} from '../common/utils/identificador-c31.util';

const dia = (d?: string | Date | null) => {
  if (!d) return '';
  const s = d instanceof Date ? d.toISOString() : String(d);
  return s.slice(0, 10).split('-').reverse().join('/');
};
const bs = (n: unknown) =>
  Number(n ?? 0).toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const estado = (e?: string) =>
  ESTADO_FISICO_LABELS[e as EstadoFisicoC31] ?? e ?? '';
const entidad = () =>
  process.env.ENTIDAD_NOMBRE ?? 'GOBIERNO AUTÓNOMO MUNICIPAL DE SAN LUCAS';

function terminar(doc: PDFKit.PDFDocument): Promise<Buffer> {
  const partes: Buffer[] = [];
  return new Promise((resolve, reject) => {
    doc.on('data', (c: Buffer) => partes.push(c));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);
    doc.end();
  });
}

function pie(doc: PDFKit.PDFDocument, texto: string) {
  const r = doc.bufferedPageRange();
  for (let i = 0; i < r.count; i++) {
    doc.switchToPage(r.start + i);
    doc.page.margins.bottom = 0;
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#6b7280')
      .text(
        `${texto} · Página ${i + 1} de ${r.count}`,
        doc.page.margins.left,
        doc.page.height - 26,
        {
          width:
            doc.page.width - doc.page.margins.left - doc.page.margins.right,
          align: 'right',
          lineBreak: false,
        },
      );
  }
}

/** Listado de comprobantes (tal como quedó filtrado en pantalla). Carta horizontal. */
export function listadoC31Pdf(
  items: ComprobantesC31[],
  opciones: { filtros: string; total: number },
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'LETTER',
    layout: 'landscape',
    margins: { top: 40, bottom: 40, left: 36, right: 36 },
    bufferPages: true,
    info: { Title: 'Listado de comprobantes C31', Author: entidad() },
  });
  const izq = doc.page.margins.left;
  const ancho = doc.page.width - izq - doc.page.margins.right;
  const limite = () => doc.page.height - 44;

  // Columnas: N°, PREV/DEV, Beneficiario, Detalle, Monto, Fecha, Estado, Ubicación
  const cols = [
    { t: 'N°', w: 0.04 },
    { t: 'C-31', w: 0.11 },
    { t: 'Beneficiario', w: 0.19 },
    { t: 'Detalle', w: 0.28 },
    { t: 'Monto (Bs)', w: 0.09, right: true },
    { t: 'Fecha', w: 0.08 },
    { t: 'Estado', w: 0.11 },
    { t: 'Folio / ubic.', w: 0.1 },
  ].map((c) => ({ ...c, px: c.w * ancho }));

  const encabezado = () => {
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#000')
      .text(entidad(), izq, 40, { width: ancho, align: 'center' });
    doc
      .fontSize(10)
      .text('LISTADO DE COMPROBANTES C-31', { width: ancho, align: 'center' });
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#374151')
      .text(opciones.filtros || 'Sin filtros', izq, doc.y + 2, {
        width: ancho,
        align: 'center',
      });
    doc.moveDown(0.6);
    const y = doc.y;
    doc.rect(izq, y, ancho, 16).fill('#e5e7eb');
    doc.fillColor('#000').font('Helvetica-Bold').fontSize(8);
    let x = izq;
    for (const c of cols) {
      doc.text(c.t, x + 3, y + 4, {
        width: c.px - 6,
        align: c.right ? 'right' : 'left',
        lineBreak: false,
      });
      x += c.px;
    }
    doc.y = y + 18;
  };
  encabezado();

  let suma = 0;
  items.forEach((c, i) => {
    const beneficiarios = (c.beneficiarios ?? [])
      .map((b) => b.nombreBeneficiario)
      .join(', ');
    const celdas = [
      String(i + 1),
      rotuloC31(c, '—'),
      beneficiarios,
      c.descripcion ?? '',
      bs(c.montoTotal),
      dia(c.fechaElaboracion),
      estado(c.estadoFisico),
      [c.numeroFolio && `F. ${c.numeroFolio}`, c.ubicacionFisica]
        .filter(Boolean)
        .join(' · '),
    ];
    doc.font('Helvetica').fontSize(7.5);
    const alto = Math.min(
      46,
      Math.max(
        ...celdas.map((t, k) =>
          doc.heightOfString(t, { width: cols[k]!.px - 6 }),
        ),
      ) + 6,
    );
    if (doc.y + alto > limite()) {
      doc.addPage();
      encabezado();
    }
    const y = doc.y;
    let x = izq;
    celdas.forEach((t, k) => {
      const col = cols[k]!;
      doc.fillColor('#000').text(t, x + 3, y + 3, {
        width: col.px - 6,
        height: alto - 4,
        ellipsis: true,
        align: col.right ? 'right' : 'left',
      });
      x += col.px;
    });
    doc
      .moveTo(izq, y + alto)
      .lineTo(izq + ancho, y + alto)
      .strokeColor('#d1d5db')
      .lineWidth(0.4)
      .stroke();
    doc.y = y + alto;
    if (c.estadoFisico !== EstadoFisicoC31.ANULADO)
      suma += Number(c.montoTotal ?? 0);
  });

  if (doc.y + 24 > limite()) doc.addPage();
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor('#000')
    .text(
      `${items.length} comprobante(s)${opciones.total > items.length ? ` de ${opciones.total}` : ''} · Total (sin anulados): Bs ${bs(suma)}`,
      izq,
      doc.y + 8,
      { width: ancho, align: 'right' },
    );
  pie(doc, `Listado C-31 · ${dia(new Date())}`);
  return terminar(doc);
}

/** Ficha de un comprobante: datos, preventivos/devengados, beneficiarios, pagos, ubicación. */
export function fichaC31Pdf(c: ComprobantesC31): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 50, bottom: 50, left: 55, right: 55 },
    bufferPages: true,
    info: { Title: `Ficha C-31 ${rotuloC31(c)}`, Author: entidad() },
  });
  const izq = doc.page.margins.left;
  const ancho = doc.page.width - izq - doc.page.margins.right;
  const limite = () => doc.page.height - 50;
  const asegurar = (h: number) => {
    if (doc.y + h > limite()) doc.addPage();
  };

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(entidad(), izq, 50, { width: ancho, align: 'center' });
  doc
    .fontSize(10)
    .text('FICHA DE COMPROBANTE C-31', { width: ancho, align: 'center' });
  doc.moveDown(0.8);

  const fila = (etq: string, val: string) => {
    asegurar(16);
    const y = doc.y;
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#374151')
      .text(etq, izq, y, { width: 120, lineBreak: false });
    doc
      .font('Helvetica')
      .fillColor('#000')
      .text(val || '—', izq + 125, y, { width: ancho - 125 });
    doc.moveDown(0.3);
  };
  const titulo = (t: string) => {
    asegurar(40);
    doc.moveDown(0.5);
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#000')
      .text(t, izq, doc.y);
    doc
      .moveTo(izq, doc.y + 1)
      .lineTo(izq + ancho, doc.y + 1)
      .strokeColor('#9ca3af')
      .lineWidth(0.6)
      .stroke();
    doc.moveDown(0.5);
  };

  titulo('Datos generales');
  fila('C-31', rotuloC31(c, '—'));
  fila(
    'Tipo',
    c.tipoC31 === 'SIN_IMPUTACION' ? 'Sin imputación' : 'Con imputación',
  );
  fila('Gestión', String(c.gestion ?? ''));
  fila('Fecha de elaboración', dia(c.fechaElaboracion));
  fila('Monto total', `Bs ${bs(c.montoTotal)}`);
  fila('Estado', estado(c.estadoFisico));
  fila('Glosa', c.descripcion ?? '');
  fila('Observaciones', c.observaciones ?? '');

  titulo('Identificadores');
  fila('Preventivos', preventivosDe(c).join(', '));
  fila('Devengados', devengadosDe(c).join(', '));

  titulo('Beneficiarios');
  for (const b of c.beneficiarios ?? []) fila('•', b.nombreBeneficiario ?? '');
  if (!c.beneficiarios?.length) fila('', 'Sin beneficiarios');

  titulo('Pagos');
  const pagos = (c.pagos ?? []).filter((p) => p.estadoPago !== 'ANULADO');
  if (!pagos.length) fila('', 'Sin pagos registrados');
  for (const p of pagos) {
    const ben = (c.beneficiarios ?? []).find(
      (b) => b.id === p.beneficiarioId,
    )?.nombreBeneficiario;
    fila(
      String(p.tipoPago ?? ''),
      `${p.numeroDocumento ?? 's/n'} · Bs ${bs(p.monto)}${p.fechaPago ? ` · ${dia(p.fechaPago)}` : ''}${ben ? ` · ${ben}` : ''}`,
    );
  }

  titulo('Archivo físico');
  fila('N° de folio', c.numeroFolio ?? '');
  fila('Ubicación', c.ubicacionFisica ?? '');
  fila(
    'Digitalizado',
    c.archivoAdjuntoUrl ? `Sí (${dia(c.fechaDigitalizacion)})` : 'No',
  );

  pie(doc, `Ficha C-31 · ${dia(new Date())}`);
  return terminar(doc);
}
