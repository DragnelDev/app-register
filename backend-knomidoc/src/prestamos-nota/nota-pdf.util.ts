import { rotuloC31 } from '../common/utils/identificador-c31.util';
import PDFDocument from 'pdfkit';
import { PrestamosNota } from './entities/prestamos-nota.entity';

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** "21 de octubre de 2026" a partir de una fecha ISO (sin desfase de zona horaria). */
export function fechaLarga(fecha?: string | Date | null): string {
  if (!fecha) return '';
  const iso = fecha instanceof Date ? fecha.toISOString() : String(fecha);
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} de ${MESES[(m as number) - 1]} de ${y}`;
}

const bs = (n: unknown) =>
  new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n ?? 0));

export interface DatosNotaPdf {
  filas: PrestamosNota[];
  emisor: { nombre: string; cargo?: string | null; unidad?: string | null };
}

/**
 * Nota de remisión de documentos en calidad de préstamo, con el formato
 * habitual de la correspondencia oficial de un municipio: membrete, CITE,
 * lugar y fecha, destinatario, referencia, cuerpo, cuadro de documentos,
 * condiciones, despedida, firmas y distribución. Tamaño carta.
 * La entidad se configura con ENTIDAD_NOMBRE, ENTIDAD_SIGLA, ENTIDAD_CIUDAD
 * y ENTIDAD_UNIDAD.
 */
export function generarNotaPrestamoPdf({
  filas,
  emisor,
}: DatosNotaPdf): Promise<Buffer> {
  const entidad =
    process.env.ENTIDAD_NOMBRE ?? 'GOBIERNO AUTÓNOMO MUNICIPAL DE SAN LUCAS';
  const sigla = process.env.ENTIDAD_SIGLA ?? 'GAMSL';
  const ciudad = process.env.ENTIDAD_CIUDAD ?? 'San Lucas';
  const unidad =
    process.env.ENTIDAD_UNIDAD ?? emisor.unidad ?? 'UNIDAD DE ARCHIVO';

  const primera = filas[0] as PrestamosNota;
  const fechaNota = primera.fechaPrestamo as string;
  const anio = String(fechaNota).slice(0, 4);
  const correlativo = String(
    Math.min(...filas.map((f) => f.id as number)),
  ).padStart(4, '0');
  const cite = `${sigla}/ARCH/N° ${correlativo}/${anio}`;
  const devolucion = filas
    .map((f) => f.fechaDevolucionEstimada)
    .filter(Boolean)
    .sort()[0];
  const observaciones = [
    ...new Set(filas.map((f) => f.observaciones).filter(Boolean)),
  ].join(' | ');

  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 42, bottom: 42, left: 64, right: 64 },
    info: {
      Title: `Nota de préstamo ${primera.numeroNotaSolicitud}`,
      Author: entidad,
    },
  });
  const partes: Buffer[] = [];
  doc.on('data', (c: Buffer) => partes.push(c));

  const ancho = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const izq = doc.page.margins.left;

  // --- Membrete
  doc.font('Helvetica-Bold').fontSize(13).text(entidad, { align: 'center' });
  doc
    .font('Helvetica')
    .fontSize(10)
    .text(unidad.toUpperCase(), { align: 'center' });
  doc.moveDown(0.2);
  doc
    .moveTo(izq, doc.y)
    .lineTo(izq + ancho, doc.y)
    .lineWidth(1.2)
    .stroke();
  doc.moveDown(0.5);

  // --- CITE y lugar/fecha
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(`CITE: ${cite}`, { align: 'right' });
  doc
    .font('Helvetica')
    .text(`${ciudad}, ${fechaLarga(new Date().toISOString())}`, {
      align: 'right',
    });
  doc.moveDown(0.6);

  // --- Destinatario
  doc.font('Helvetica').fontSize(10.5).text('Señor(a):');
  doc
    .font('Helvetica-Bold')
    .text(
      String(
        primera.destinatario ?? primera.funcionarioResponsable ?? '',
      ).toUpperCase(),
    );
  doc
    .font('Helvetica-Bold')
    .text(String(primera.institucionSolicitante ?? '').toUpperCase());
  doc.font('Helvetica-Bold').text('Presente.-');
  doc.moveDown(0.5);

  // --- Referencia
  doc.font('Helvetica-Bold').text('REF.: ', { continued: true });
  doc.text(
    (
      primera.referencia?.trim() ||
      `REMISIÓN DE COMPROBANTES C31 EN CALIDAD DE PRÉSTAMO (RESPUESTA A SU NOTA ${String(primera.numeroNotaSolicitud)})`
    ).toUpperCase(),
    { underline: false },
  );
  doc.moveDown(0.5);

  // --- Cuerpo
  doc
    .font('Helvetica')
    .fontSize(10.5)
    .text('De mi mayor consideración:', { align: 'left' });
  doc.moveDown(0.3);
  doc.text(
    `En atención a su nota ${primera.numeroNotaSolicitud} y en el marco de la normativa de gestión documental, ` +
      `se remite en calidad de PRÉSTAMO TEMPORAL ${filas.length === 1 ? 'el siguiente comprobante C31' : `los siguientes ${filas.length} comprobantes C31`}, ` +
      `custodiados por la ${unidad.toLowerCase()} de ${entidad.toLowerCase().includes('municipal') ? 'este Gobierno Autónomo Municipal' : 'esta entidad'}:`,
    { align: 'justify' },
  );
  doc.moveDown(0.4);

  // --- Tabla de documentos
  const columnas = [
    { t: 'N°', w: 22, a: 'center' as const },
    { t: 'N° C31', w: 62, a: 'left' as const },
    { t: 'Gest.', w: 30, a: 'center' as const },
    {
      t: 'Beneficiario / Glosa',
      w: ancho - 22 - 62 - 30 - 58 - 48,
      a: 'left' as const,
    },
    { t: 'Monto (Bs)', w: 58, a: 'right' as const },
    { t: 'Folio', w: 48, a: 'center' as const },
  ];
  const fs = 8;
  const pad = 3;
  const filaAlto = (celdas: string[]) =>
    Math.max(
      ...celdas.map((txt, i) =>
        doc
          .font('Helvetica')
          .fontSize(fs)
          .heightOfString(txt, {
            width: (columnas[i] as { w: number }).w - pad * 2,
          }),
      ),
    ) +
    pad * 2;
  const dibujarFila = (celdas: string[], y: number, h: number, cab = false) => {
    let x = izq;
    columnas.forEach((c, i) => {
      doc.rect(x, y, c.w, h).lineWidth(0.5).stroke();
      doc
        .font(cab ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(fs)
        .text(celdas[i] as string, x + pad, y + pad, {
          width: c.w - pad * 2,
          align: cab ? 'center' : c.a,
        });
      x += c.w;
    });
  };
  let y = doc.y;
  dibujarFila(
    columnas.map((c) => c.t),
    y,
    16,
    true,
  );
  y += 16;
  let total = 0;
  filas.forEach((f, i) => {
    const c = f.comprobante;
    const ident = rotuloC31(c, '—');
    const benef = (c?.beneficiarios ?? [])
      .map((b) => b.nombreBeneficiario)
      .join(', ');
    const glosa = String(c?.descripcion ?? '').replace(/\s+/g, ' ');
    const celdas = [
      String(i + 1),
      `${c?.tipoC31 === 'SIN_IMPUTACION' ? 'Dev.' : 'Prev.'} ${ident}`,
      String(c?.gestion ?? ''),
      `${benef}${benef && glosa ? ' — ' : ''}${glosa.length > 100 ? glosa.slice(0, 97) + '…' : glosa}`,
      bs(c?.montoTotal),
      c?.numeroFolio ?? '—',
    ];
    const h = filaAlto(celdas);
    if (y + h > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      y = doc.page.margins.top;
      dibujarFila(
        columnas.map((c2) => c2.t),
        y,
        16,
        true,
      );
      y += 16;
    }
    dibujarFila(celdas, y, h);
    y += h;
    total += Number(c?.montoTotal ?? 0);
  });
  doc.y = y + 8;
  doc.x = izq;

  // --- Condiciones
  doc.font('Helvetica').fontSize(10.5);
  doc.text(
    `Los documentos deberán ser devueltos ${devolucion ? `hasta el ${fechaLarga(devolucion)}` : 'a la brevedad posible, una vez concluida la revisión'}, ` +
      'en las mismas condiciones en que fueron entregados: completos, foliados y sin alteraciones, ' +
      'quedando bajo responsabilidad del receptor su custodia y conservación mientras permanezcan fuera del archivo.',
    izq,
    doc.y,
    { width: ancho, align: 'justify' },
  );
  if (observaciones) {
    doc.moveDown(0.3);
    doc
      .font('Helvetica-Bold')
      .text('Observaciones: ', { continued: true, width: ancho });
    doc.font('Helvetica').text(observaciones, { width: ancho });
  }
  doc.moveDown(0.4);
  doc.text('Sin otro particular, saludo a usted atentamente.', izq, doc.y, {
    width: ancho,
  });

  // --- Firmas, fecha de recepción y distribución: un solo bloque que sigue al
  // texto. Si no cabe completo en la hoja se pasa entero a la siguiente (nunca
  // queda una firma suelta ni una hoja casi vacía).
  // El bloque mide ~115 pt (42 de espacio para firmar + firmas + recepción + Cc).
  // Se escribe dentro del margen inferior, por eso se anula: pdfkit agrega una
  // hoja en blanco si un texto termina más abajo del margen.
  const ALTO_FIRMAS = 115;
  const LIMITE_INFERIOR = doc.page.height - 30;
  if (doc.y + ALTO_FIRMAS > LIMITE_INFERIOR) {
    doc.addPage();
  }
  doc.page.margins.bottom = 0;
  const yf = doc.y + 42;
  const mitad = ancho / 2 - 15;
  const bloque = (x: number, titulo: string, l1: string, l2: string) => {
    doc
      .moveTo(x, yf)
      .lineTo(x + mitad, yf)
      .lineWidth(0.7)
      .stroke();
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(titulo, x, yf + 4, { width: mitad, align: 'center' });
    doc
      .font('Helvetica')
      .fontSize(9)
      .text(l1, x, doc.y, { width: mitad, align: 'center' });
    if (l2) doc.text(l2, x, doc.y, { width: mitad, align: 'center' });
  };
  bloque(
    izq,
    'ENTREGUÉ CONFORME',
    emisor.nombre,
    [emisor.cargo, unidad].filter(Boolean).join(' - '),
  );
  const yAbajoEmisor = doc.y;
  bloque(
    izq + mitad + 30,
    'RECIBÍ CONFORME',
    String(primera.funcionarioResponsable ?? ''),
    String(primera.institucionSolicitante ?? ''),
  );
  const yDebajo = Math.max(yAbajoEmisor, doc.y) + 10;
  doc
    .font('Helvetica')
    .fontSize(8)
    .text(
      'Fecha y hora de recepción: ____ / ____ / ________   ____:____        C.I.: ______________',
      izq,
      yDebajo,
      { width: ancho, align: 'right' },
    );
  doc.fontSize(8).text('Cc. Archivo', izq, doc.y + 6, { width: ancho });
  doc.end();

  return new Promise((resolve) =>
    doc.on('end', () => resolve(Buffer.concat(partes))),
  );
}
