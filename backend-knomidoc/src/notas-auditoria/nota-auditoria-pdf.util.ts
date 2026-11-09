import PDFDocument from 'pdfkit';
import { NotaAuditoria } from './entities/nota-auditoria.entity';

const fmtDia = (d?: string | null) =>
  d ? d.split('-').reverse().join('/') : '';

/**
 * Nota interna de respuesta a Auditoría: bloque CITE/FECHA/A/VIA/DE/REF,
 * texto de introducción, secciones (título + texto + cuadro Nº / Nº Prev.)
 * y cierre con firma. Tamaño carta.
 */
export function notaAuditoriaPdf(n: NotaAuditoria): Promise<Buffer> {
  const entidad =
    process.env.ENTIDAD_NOMBRE ?? 'GOBIERNO AUTÓNOMO MUNICIPAL DE SAN LUCAS';
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 50, bottom: 50, left: 60, right: 60 },
    bufferPages: true,
    info: { Title: `Nota ${n.cite}`, Author: entidad },
  });
  const partes: Buffer[] = [];
  doc.on('data', (c: Buffer) => partes.push(c));

  const izq = doc.page.margins.left;
  const ancho = doc.page.width - izq - doc.page.margins.right;
  const limite = () => doc.page.height - doc.page.margins.bottom;
  const asegurar = (alto: number) => {
    if (doc.y + alto > limite()) doc.addPage();
  };

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(entidad, izq, 50, { width: ancho, align: 'center' });
  doc.fontSize(10).text('NOTA INTERNA', { width: ancho, align: 'center' });
  doc.moveDown(0.8);

  // Bloque de encabezado con etiqueta a la izquierda
  const ETQ = 62;
  const fila = (etq: string, lineas: string[], negrita = false) => {
    asegurar(14 * lineas.length + 6);
    const y = doc.y;
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(`${etq}:`, izq, y, { width: ETQ, lineBreak: false });
    lineas.filter(Boolean).forEach((l, i) => {
      doc
        .font(
          i === 0 && !negrita
            ? 'Helvetica'
            : negrita || i === 1
              ? 'Helvetica-Bold'
              : 'Helvetica',
        )
        .fontSize(10)
        .text(l, izq + ETQ + 8, doc.y, { width: ancho - ETQ - 8 });
      void i;
    });
    doc.moveDown(0.5);
  };
  fila('CITE', [n.cite ?? ''], false);
  fila('FECHA', [fmtDia(n.fecha)]);
  fila('A', [n.destinatario?.nombre ?? '', n.destinatario?.cargo ?? '']);
  if (n.via?.nombre) fila('VIA', [n.via.nombre, n.via.cargo]);
  fila('DE', [n.remitente?.nombre ?? '', n.remitente?.cargo ?? '']);
  fila('REF.', [n.referencia ?? '']);
  if (n.notasPrestamo?.length) fila('NOTA(S)', [n.notasPrestamo.join(', ')]);
  doc
    .moveTo(izq, doc.y)
    .lineTo(izq + ancho, doc.y)
    .strokeColor('#000')
    .lineWidth(1)
    .stroke();
  doc.moveDown(0.8);

  const parrafo = (t: string) => {
    if (!t.trim()) return;
    doc
      .font('Helvetica')
      .fontSize(10)
      .text(t, izq, doc.y, { width: ancho, align: 'justify' });
    doc.moveDown(0.6);
  };
  doc
    .font('Helvetica')
    .fontSize(10)
    .text('De mi mayor consideración:', izq, doc.y);
  doc.moveDown(0.6);
  parrafo(n.introduccion ?? '');

  for (const s of n.secciones ?? []) {
    asegurar(50);
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(`•  ${s.titulo}`, izq + 8, doc.y, { width: ancho - 8 });
    if (s.texto?.trim())
      doc.font('Helvetica').text(s.texto, izq + 24, doc.y + 2, {
        width: ancho - 24,
        align: 'justify',
      });
    doc.moveDown(0.4);

    // Cuadro "Nº | Nº Prev." repetido en bloques de columnas (como la hoja de cálculo)
    const items = s.items ?? [];
    if (items.length) {
      const grupos = items.length > 30 ? 5 : items.length > 12 ? 4 : 2;
      const filas = Math.ceil(items.length / grupos);
      const gAncho = (ancho - 24) / grupos;
      const hFila = 14;
      const x0 = izq + 24;
      let desde = 0;
      while (desde < filas) {
        asegurar(hFila * 2);
        const cap = Math.max(1, Math.floor((limite() - doc.y) / hFila) - 1);
        const hasta = Math.min(filas, desde + cap);
        const y0 = doc.y;
        doc.rect(x0, y0, gAncho * grupos, hFila).fill('#e5e7eb');
        doc.fillColor('#000').font('Helvetica-Bold').fontSize(8.5);
        for (let g = 0; g < grupos; g++) {
          doc.text('Nº', x0 + g * gAncho + 3, y0 + 3, {
            width: 22,
            lineBreak: false,
          });
          doc.text('Nº Prev.', x0 + g * gAncho + 28, y0 + 3, {
            width: gAncho - 30,
            lineBreak: false,
          });
        }
        doc.font('Helvetica').fontSize(8.5);
        for (let r = desde; r < hasta; r++) {
          const y = y0 + hFila * (r - desde + 1);
          for (let g = 0; g < grupos; g++) {
            const idx = g * filas + r;
            if (idx >= items.length) continue;
            doc.text(String(idx + 1), x0 + g * gAncho + 3, y + 3, {
              width: 22,
              lineBreak: false,
            });
            doc.text(items[idx]!, x0 + g * gAncho + 28, y + 3, {
              width: gAncho - 30,
              lineBreak: false,
            });
          }
        }
        const alto = hFila * (hasta - desde + 1);
        doc
          .rect(x0, y0, gAncho * grupos, alto)
          .strokeColor('#9ca3af')
          .lineWidth(0.5)
          .stroke();
        for (let g = 1; g < grupos; g++)
          doc
            .moveTo(x0 + g * gAncho, y0)
            .lineTo(x0 + g * gAncho, y0 + alto)
            .stroke();
        doc.y = y0 + alto + 6;
        desde = hasta;
        if (desde < filas) doc.addPage();
      }
    }
    doc.moveDown(0.6);
  }

  parrafo(n.cierre ?? '');

  asegurar(110);
  doc
    .font('Helvetica')
    .fontSize(10)
    .text('Atentamente,', izq, doc.y + 4, { width: ancho });
  const yf = doc.y + 60;
  doc.page.margins.bottom = 0;
  doc
    .moveTo(izq + ancho / 2 - 90, yf)
    .lineTo(izq + ancho / 2 + 90, yf)
    .strokeColor('#000')
    .lineWidth(0.7)
    .stroke();
  doc
    .font('Helvetica-Bold')
    .fontSize(9.5)
    .text(n.remitente?.nombre ?? '', izq, yf + 4, {
      width: ancho,
      align: 'center',
      lineBreak: false,
    });
  doc.font('Helvetica').text(n.remitente?.cargo ?? '', izq, yf + 17, {
    width: ancho,
    align: 'center',
    lineBreak: false,
  });

  const rango = doc.bufferedPageRange();
  for (let i = 0; i < rango.count; i++) {
    doc.switchToPage(rango.start + i);
    doc.page.margins.bottom = 0;
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#6b7280')
      .text(
        `${n.cite} · Página ${i + 1} de ${rango.count}`,
        izq,
        doc.page.height - 30,
        { width: ancho, align: 'right', lineBreak: false },
      );
  }
  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);
    doc.end();
  });
}
