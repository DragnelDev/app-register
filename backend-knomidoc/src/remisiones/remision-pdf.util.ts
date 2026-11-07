import PDFDocument from 'pdfkit';

export interface RemisionVista {
  numeroRemision: string;
  gestion: number;
  estado: string;
  unidadRemitente?: string | null;
  observacion?: string | null;
  remitente: string | null;
  receptor: string | null;
  fechaEnvio?: Date | null;
  fechaRecepcion?: Date | null;
  observacionRecepcion?: string | null;
  items: {
    identificador: string;
    montoTotal?: number | string | null;
    descripcion?: string | null;
    recibido: boolean | null;
    observacion: string | null;
  }[];
}

const ESTADO: Record<string, string> = {
  BORRADOR: 'Borrador',
  ENVIADA: 'Enviada — pendiente de recepción',
  RECIBIDA: 'Recibida por Archivo',
  OBSERVADA: 'Recibida con observaciones',
};

const fmtFecha = (d?: Date | null) =>
  d
    ? new Date(d).toLocaleString('es-BO', {
        timeZone: 'America/La_Paz',
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : '—';
const bs = (n?: number | string | null) =>
  n == null
    ? '—'
    : Number(n).toLocaleString('es-BO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

/** Nota de remisión de comprobantes C31 hacia Archivo, con firmas del remitente y del receptor. */
export function remisionPdf(r: RemisionVista): Promise<Buffer> {
  const entidad =
    process.env.ENTIDAD_NOMBRE ?? 'GOBIERNO AUTÓNOMO MUNICIPAL DE SAN LUCAS';
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 42, bottom: 42, left: 50, right: 50 },
    bufferPages: true,
    info: { Title: `Remisión ${r.numeroRemision}`, Author: entidad },
  });
  const partes: Buffer[] = [];
  doc.on('data', (c: Buffer) => partes.push(c));

  const izq = doc.page.margins.left;
  const ancho = doc.page.width - izq - doc.page.margins.right;
  const margenInf = doc.page.margins.bottom;
  const limite = () => doc.page.height - margenInf;

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(entidad, izq, 42, { width: ancho, align: 'center' });
  doc
    .fontSize(14)
    .text('REMISIÓN DE COMPROBANTES C31', { width: ancho, align: 'center' });
  doc
    .fontSize(10)
    .text(`N° ${r.numeroRemision}`, { width: ancho, align: 'center' });
  doc.moveDown(0.8);

  const dato = (t: string, v: string) => {
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(`${t}: `, izq, doc.y, { continued: true, width: ancho });
    doc.font('Helvetica').text(v);
  };
  dato(
    'Remitente',
    `${r.remitente ?? '—'}${r.unidadRemitente ? ' — ' + r.unidadRemitente : ''}`,
  );
  dato('Destino', 'Archivo (custodia de comprobantes C31)');
  dato('Fecha de envío', fmtFecha(r.fechaEnvio));
  dato('Estado', ESTADO[r.estado] ?? r.estado);
  if (r.observacion) dato('Observación', r.observacion);
  doc.moveDown(0.6);

  // ── tabla ──
  const cols = [
    { t: 'N°', w: 0.06 },
    { t: 'Comprobante', w: 0.18 },
    { t: 'Glosa', w: 0.46 },
    { t: 'Monto (Bs)', w: 0.14 },
    { t: 'Recepción', w: 0.16 },
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
  r.items.forEach((it, idx) => {
    const glosa = (it.descripcion ?? '').slice(0, 220);
    const recep =
      it.recibido === true
        ? 'Recibido'
        : it.recibido === false
          ? `Observado: ${it.observacion ?? ''}`
          : 'Pendiente';
    const alto = Math.max(
      14,
      doc.heightOfString(glosa, { width: cols[2].w * ancho - 6 }) + 4,
      doc.heightOfString(recep, { width: cols[4].w * ancho - 6 }) + 4,
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
    doc.text(it.identificador, x(1) + 3, y + 2, {
      width: cols[1].w * ancho - 6,
    });
    doc.text(glosa, x(2) + 3, y + 2, { width: cols[2].w * ancho - 6 });
    doc.text(bs(it.montoTotal), x(3) + 3, y + 2, {
      width: cols[3].w * ancho - 6,
      align: 'right',
    });
    doc.text(recep, x(4) + 3, y + 2, { width: cols[4].w * ancho - 6 });
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
    .text(`Total de comprobantes: ${r.items.length}`, izq, doc.y + 6, {
      width: ancho,
    });
  if (r.observacionRecepcion) {
    doc
      .font('Helvetica')
      .text(`Observación de Archivo: ${r.observacionRecepcion}`, {
        width: ancho,
      });
  }

  // ── firmas (se escriben dentro del margen inferior: se anula para no crear una hoja extra) ──
  const ALTO_FIRMAS = 90;
  if (doc.y + ALTO_FIRMAS > doc.page.height - 30) doc.addPage();
  doc.page.margins.bottom = 0;
  const yf = Math.max(doc.y + 50, 0);
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
  firma(izq, 'ENTREGUÉ CONFORME', r.remitente ?? '', 'Remitente');
  firma(
    izq + mitad,
    'RECIBÍ CONFORME',
    r.receptor ?? '',
    'Archivo' + (r.fechaRecepcion ? ` · ${fmtFecha(r.fechaRecepcion)}` : ''),
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
        `${r.numeroRemision} · Página ${i + 1} de ${rango.count}`,
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
