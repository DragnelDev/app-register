import PDFDocument from 'pdfkit';
import { rotuloC31 } from '../common/utils/identificador-c31.util';
import { ActasEntrega } from './entities/actas-entrega.entity';

const ESTADO: Record<string, string> = {
  BORRADOR: 'Pendiente de recepción por Archivo',
  RECIBIDA: 'Recibida por Archivo',
  ANULADA: 'Anulada',
};

const fmtFecha = (d?: Date | string | null) =>
  d
    ? new Date(d).toLocaleString('es-BO', {
        timeZone: 'America/La_Paz',
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : '—';
const fmtDia = (d?: string | null) =>
  d ? d.split('-').reverse().join('/') : '—';
const bs = (n?: number | string | null) =>
  n == null || n === ''
    ? '—'
    : Number(n).toLocaleString('es-BO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

/**
 * CITE del acta: GAMSL/ARCH/AE-N° 004/2026 a partir de AE-2026-004.
 * El prefijo institucional se configura con CITE_PREFIJO.
 */
export function citeActa(numeroActa?: string | null): string {
  const prefijo = process.env.CITE_PREFIJO ?? 'GAMSL/ARCH';
  const m = /^AE-(\d{4})-(\d+)$/.exec(numeroActa ?? '');
  return m
    ? `${prefijo}/AE-N° ${m[2].padStart(3, '0')}/${m[1]}`
    : (numeroActa ?? '—');
}

/** Acta de entrega de comprobantes C31 a Archivo, con firmas de quien entrega y de quien recibe. */
export function actaPdf(acta: ActasEntrega): Promise<Buffer> {
  const entidad =
    process.env.ENTIDAD_NOMBRE ?? 'GOBIERNO AUTÓNOMO MUNICIPAL DE SAN LUCAS';
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 42, bottom: 42, left: 50, right: 50 },
    bufferPages: true,
    info: { Title: `Acta de entrega ${acta.numeroActa}`, Author: entidad },
  });
  const partes: Buffer[] = [];
  doc.on('data', (c: Buffer) => partes.push(c));

  const izq = doc.page.margins.left;
  const ancho = doc.page.width - izq - doc.page.margins.right;
  const limite = () => doc.page.height - doc.page.margins.bottom;

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(entidad, izq, 42, { width: ancho, align: 'center' });
  doc.fontSize(14).text('ACTA DE ENTREGA DE COMPROBANTES C31', {
    width: ancho,
    align: 'center',
  });
  doc.fontSize(10).text(`CITE: ${citeActa(acta.numeroActa)}`, {
    width: ancho,
    align: 'center',
  });
  doc.moveDown(0.8);
  doc
    .font('Helvetica')
    .fontSize(9.5)
    .text(
      `En la unidad de ${acta.unidadEmisora ?? 'origen'}, el ${fmtDia(acta.fechaRecepcion)}, se procedió a la entrega de la documentación detallada a continuación al responsable de Archivos, con el siguiente detalle:`,
      izq,
      doc.y,
      { width: ancho, align: 'justify' },
    );
  doc.moveDown(0.6);

  const dato = (t: string, v: string) => {
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(`${t}: `, izq, doc.y, { continued: true, width: ancho });
    doc.font('Helvetica').text(v);
  };
  dato('Unidad emisora', acta.unidadEmisora ?? '—');
  dato('Entrega', acta.responsableEntrega ?? '—');
  dato('Recibe', acta.responsableRecepcion ?? '—');
  dato('Fecha de entrega', fmtDia(acta.fechaRecepcion));
  dato('Estado', ESTADO[acta.estado ?? ''] ?? acta.estado ?? '—');
  if (acta.fechaAprobacion)
    dato(
      'Recepción en Archivo',
      `${fmtFecha(acta.fechaAprobacion)}${acta.aprobadoPor ? ' — ' + acta.aprobadoPor.nombreCompleto : ''}`,
    );
  if (acta.observaciones) dato('Observaciones', acta.observaciones);
  doc.moveDown(0.6);

  const cols = [
    { t: 'N°', w: 0.06 },
    { t: 'Comprobante', w: 0.2 },
    { t: 'Beneficiario / Glosa', w: 0.5 },
    { t: 'Monto (Bs)', w: 0.14 },
    { t: 'Gestión', w: 0.1 },
  ];
  const x = (i: number) =>
    izq + cols.slice(0, i).reduce((a, c) => a + c.w * ancho, 0);
  const cabecera = () => {
    const y = doc.y;
    doc.rect(izq, y, ancho, 16).fill('#e5e7eb');
    doc.fillColor('#000').font('Helvetica-Bold').fontSize(8.5);
    cols.forEach((c, i) =>
      doc.text(c.t, x(i) + 3, y + 4, {
        width: c.w * ancho - 6,
        lineBreak: false,
      }),
    );
    doc.y = y + 18;
  };
  cabecera();
  doc.font('Helvetica').fontSize(8.5);
  const items = acta.comprobantesC31 ?? [];
  let total = 0;
  items.forEach((c, idx) => {
    const benef = (c.beneficiarios ?? [])
      .map((b) => b.nombreBeneficiario)
      .filter(Boolean)
      .join(', ');
    const texto = `${benef ? benef + ' — ' : ''}${c.descripcion ?? ''}`.slice(
      0,
      260,
    );
    total += Number(c.montoTotal ?? 0);
    const alto = Math.max(
      14,
      doc.heightOfString(texto, { width: cols[2].w * ancho - 6 }) + 4,
    );
    if (doc.y + alto > limite() - 4) {
      doc.addPage();
      cabecera();
      doc.font('Helvetica').fontSize(8.5);
    }
    const y = doc.y;
    doc.text(String(idx + 1), x(0) + 3, y + 2, {
      width: cols[0].w * ancho - 6,
    });
    doc.text(rotuloC31(c, `#${c.id}`), x(1) + 3, y + 2, {
      width: cols[1].w * ancho - 6,
    });
    doc.text(texto, x(2) + 3, y + 2, { width: cols[2].w * ancho - 6 });
    doc.text(bs(c.montoTotal), x(3) + 3, y + 2, {
      width: cols[3].w * ancho - 6,
      align: 'right',
    });
    doc.text(String(c.gestion ?? ''), x(4) + 3, y + 2, {
      width: cols[4].w * ancho - 6,
    });
    doc
      .moveTo(izq, y + alto)
      .lineTo(izq + ancho, y + alto)
      .strokeColor('#d1d5db')
      .lineWidth(0.5)
      .stroke();
    doc.y = y + alto;
  });
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(
      `Total: ${items.length} comprobante(s) — Bs ${bs(total)}`,
      izq,
      doc.y + 6,
      { width: ancho },
    );

  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .text('Nota: ', izq, doc.y + 8, { continued: true, width: ancho });
  doc
    .font('Helvetica')
    .text(
      'La entrega se realizó con la documentación completa de cada uno de los comprobantes.',
    );

  // Las firmas se escriben dentro del margen inferior: se anula para no crear una hoja extra
  const ALTO_FIRMAS = 90;
  if (doc.y + ALTO_FIRMAS > doc.page.height - 30) doc.addPage();
  doc.page.margins.bottom = 0;
  const yf = doc.y + 50;
  const mitad = ancho / 2;
  const firma = (cx: number, titulo: string, nombre: string, extra: string) => {
    doc
      .moveTo(cx + 20, yf)
      .lineTo(cx + mitad - 20, yf)
      .strokeColor('#000')
      .lineWidth(0.7)
      .stroke();
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(titulo, cx, yf + 4, {
        width: mitad,
        align: 'center',
        lineBreak: false,
      });
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .text(nombre, cx, yf + 16, {
        width: mitad,
        align: 'center',
        lineBreak: false,
      });
    doc.text(extra, cx, yf + 28, {
      width: mitad,
      align: 'center',
      lineBreak: false,
    });
  };
  firma(
    izq,
    'ENTREGUÉ CONFORME',
    acta.responsableEntrega ?? '',
    acta.unidadEmisora ?? '',
  );
  firma(
    izq + mitad,
    'RECIBÍ CONFORME',
    acta.responsableRecepcion ?? '',
    'Archivo',
  );

  const rango = doc.bufferedPageRange();
  for (let i = 0; i < rango.count; i++) {
    doc.switchToPage(rango.start + i);
    doc.page.margins.bottom = 0;
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#6b7280')
      .text(
        `${citeActa(acta.numeroActa)} · Página ${i + 1} de ${rango.count}`,
        izq,
        doc.page.height - 28,
        { width: ancho, align: 'right', lineBreak: false },
      );
  }

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);
    doc.end();
  });
}
