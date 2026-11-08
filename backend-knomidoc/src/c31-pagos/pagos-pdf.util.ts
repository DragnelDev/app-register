import PDFDocument from 'pdfkit';
import { C31Pago, TipoPago } from './entities/c31-pago.entity';
import { rotuloC31 } from '../common/utils/identificador-c31.util';

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
const entidad = () =>
  process.env.ENTIDAD_NOMBRE ?? 'GOBIERNO AUTÓNOMO MUNICIPAL DE SAN LUCAS';
const tipo = (t?: string) =>
  t === TipoPago.CHEQUE ? 'Cheque' : 'Pago electrónico';
const estadoTxt = (e?: string) =>
  e === 'PAGADO' ? 'Pagado' : e === 'ANULADO' ? 'Anulado' : 'Pendiente';

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

/** Listado de pagos (con los filtros de pantalla). Carta horizontal. */
export function listadoPagosPdf(
  pagos: C31Pago[],
  opciones: { filtros: string },
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'LETTER',
    layout: 'landscape',
    margins: { top: 40, bottom: 40, left: 36, right: 36 },
    bufferPages: true,
    info: { Title: 'Listado de pagos C31', Author: entidad() },
  });
  const izq = doc.page.margins.left;
  const ancho = doc.page.width - izq - doc.page.margins.right;
  const limite = () => doc.page.height - 44;
  const cols = [
    { t: 'N°', w: 0.04 },
    { t: 'C-31', w: 0.11 },
    { t: 'Beneficiario', w: 0.22 },
    { t: 'Forma', w: 0.1 },
    { t: 'N° doc. / Banco', w: 0.17 },
    { t: 'Monto (Bs)', w: 0.1, right: true },
    { t: 'Fecha', w: 0.09 },
    { t: 'Estado', w: 0.17 },
  ].map((c) => ({ ...c, px: c.w * ancho }));

  const encabezado = () => {
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#000')
      .text(entidad(), izq, 40, { width: ancho, align: 'center' });
    doc.fontSize(10).text('LISTADO DE PAGOS — COMPROBANTES C-31', {
      width: ancho,
      align: 'center',
    });
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

  let pagado = 0;
  let pendiente = 0;
  pagos.forEach((p, i) => {
    if (p.estadoPago === 'PAGADO') pagado += Number(p.monto ?? 0);
    else if (p.estadoPago !== 'ANULADO') pendiente += Number(p.monto ?? 0);
    const celdas = [
      String(i + 1),
      rotuloC31(p.comprobante, '—'),
      p.beneficiario?.nombreBeneficiario ?? '',
      tipo(p.tipoPago),
      [p.numeroDocumento, p.banco].filter(Boolean).join(' · '),
      bs(p.monto),
      dia(p.fechaPago),
      estadoTxt(p.estadoPago),
    ];
    doc.font('Helvetica').fontSize(7.5);
    const alto = Math.min(
      40,
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
      doc
        .fillColor(p.estadoPago === 'ANULADO' ? '#9ca3af' : '#000')
        .text(t, x + 3, y + 3, {
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
      .strokeColor('#e5e7eb')
      .lineWidth(0.5)
      .stroke();
    doc.y = y + alto;
  });

  if (doc.y + 40 > limite()) doc.addPage();
  doc.moveDown(0.8).font('Helvetica-Bold').fontSize(9).fillColor('#000');
  doc.text(
    `${pagos.length} pago(s) · Pagado: Bs ${bs(pagado)} · Pendiente: Bs ${bs(pendiente)}`,
    izq,
    doc.y,
    { width: ancho, align: 'right' },
  );
  pie(doc, `${entidad()} · Emitido ${dia(new Date())}`);
  return terminar(doc);
}

/** Constancia de pago individual. Carta vertical. */
export function constanciaPagoPdf(
  pago: C31Pago,
  resumen: { montoTotal: number; pagado: number; saldo: number },
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 50, bottom: 50, left: 56, right: 56 },
    bufferPages: true,
    info: { Title: `Constancia de pago ${pago.id}`, Author: entidad() },
  });
  const izq = doc.page.margins.left;
  const ancho = doc.page.width - izq - doc.page.margins.right;
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#000')
    .text(entidad(), izq, 50, { width: ancho, align: 'center' });
  doc
    .fontSize(14)
    .moveDown(0.4)
    .text('CONSTANCIA DE PAGO', { width: ancho, align: 'center' });
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#374151')
    .text(
      `N° ${String(pago.id).padStart(6, '0')} · ${estadoTxt(pago.estadoPago)}`,
      { width: ancho, align: 'center' },
    );
  doc.moveDown(1.2);

  const filas: [string, string][] = [
    ['Comprobante C-31', rotuloC31(pago.comprobante, '—')],
    ['Gestión', String(pago.comprobante?.gestion ?? '')],
    ['Glosa', pago.comprobante?.descripcion ?? ''],
    ['Beneficiario', pago.beneficiario?.nombreBeneficiario ?? ''],
    ['Forma de pago', tipo(pago.tipoPago)],
    [
      pago.tipoPago === TipoPago.CHEQUE
        ? 'N° de cheque'
        : 'N° de transferencia',
      pago.numeroDocumento ?? '—',
    ],
    ['Banco', pago.banco ?? '—'],
    ['Fecha de pago', dia(pago.fechaPago) || '—'],
    ['Monto pagado', `Bs ${bs(pago.monto)}`],
    ['Observaciones', pago.observaciones ?? '—'],
  ];
  for (const [k, v] of filas) {
    const y = doc.y;
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#111827')
      .text(k, izq, y, { width: 130 });
    doc
      .font('Helvetica')
      .fontSize(10)
      .text(v, izq + 135, y, { width: ancho - 135 });
    doc.y = Math.max(doc.y, y + 14) + 4;
    doc
      .moveTo(izq, doc.y - 2)
      .lineTo(izq + ancho, doc.y - 2)
      .strokeColor('#e5e7eb')
      .lineWidth(0.5)
      .stroke();
  }
  doc
    .moveDown(0.8)
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor('#000')
    .text('Situación del comprobante', izq, doc.y);
  doc
    .font('Helvetica')
    .fontSize(9.5)
    .moveDown(0.3)
    .text(
      `Total: Bs ${bs(resumen.montoTotal)}   ·   Pagado: Bs ${bs(resumen.pagado)}   ·   Saldo por pagar: Bs ${bs(resumen.saldo)}`,
    );

  const yf = doc.page.height - 150;
  for (const [i, t] of ['Elaborado por', 'Recibí conforme'].entries()) {
    const x = izq + i * (ancho / 2) + 20;
    doc
      .moveTo(x, yf)
      .lineTo(x + ancho / 2 - 40, yf)
      .strokeColor('#000')
      .lineWidth(0.7)
      .stroke();
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor('#000')
      .text(t, x, yf + 4, { width: ancho / 2 - 40, align: 'center' });
  }
  pie(doc, `${entidad()} · Emitido ${dia(new Date())}`);
  return terminar(doc);
}
