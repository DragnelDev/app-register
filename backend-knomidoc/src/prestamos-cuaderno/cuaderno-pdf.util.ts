import { identificadorC31 } from '../common/utils/identificador-c31.util';
import PDFDocument from 'pdfkit';
import { PrestamosCuaderno } from './entities/prestamos-cuaderno.entity';

const ZONA = 'America/La_Paz';

const fechaHora = (d?: Date | string | null): string =>
  d
    ? new Date(d).toLocaleString('es-BO', {
        timeZone: ZONA,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '—';

const soloFecha = (d?: string | Date | null): string => {
  if (!d) return '—';
  const [y, m, dia] = String(d instanceof Date ? d.toISOString() : d)
    .slice(0, 10)
    .split('-');
  return `${dia}/${m}/${y}`;
};

export interface DatosReporteCuaderno {
  filas: PrestamosCuaderno[];
  /** Descripción legible de los filtros aplicados, p. ej. "Gestión: 2026". */
  filtros: string[];
  emisor: string;
}

/**
 * Planilla (carta horizontal) de los préstamos registrados en el cuaderno de
 * control de salida, con el resumen de los filtros usados y los totales.
 */
export function generarReporteCuadernoPdf({
  filas,
  filtros,
  emisor,
}: DatosReporteCuaderno): Promise<Buffer> {
  const entidad =
    process.env.ENTIDAD_NOMBRE ?? 'GOBIERNO AUTÓNOMO MUNICIPAL DE SAN LUCAS';
  const unidad = process.env.ENTIDAD_UNIDAD ?? 'UNIDAD DE ARCHIVO';

  const doc = new PDFDocument({
    size: 'LETTER',
    layout: 'landscape',
    margins: { top: 50, bottom: 50, left: 40, right: 40 },
    bufferPages: true,
    info: { Title: 'Planilla de préstamos por cuaderno', Author: entidad },
  });
  const partes: Buffer[] = [];
  doc.on('data', (c: Buffer) => partes.push(c));

  const izq = doc.page.margins.left;
  const ancho = doc.page.width - izq - doc.page.margins.right;
  const limiteY = () => doc.page.height - doc.page.margins.bottom - 10;

  // --- Encabezado
  doc.font('Helvetica-Bold').fontSize(12).text(entidad, { align: 'center' });
  doc.font('Helvetica').fontSize(9).text(unidad.toUpperCase(), {
    align: 'center',
  });
  doc.moveDown(0.4);
  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .text('PLANILLA DE PRÉSTAMOS POR CUADERNO DE CONTROL', {
      align: 'center',
    });
  doc.moveDown(0.3);
  doc
    .font('Helvetica')
    .fontSize(9)
    .text(
      filtros.length ? `Filtros: ${filtros.join('  |  ')}` : 'Filtros: ninguno',
      { align: 'center' },
    );
  doc.moveDown(0.6);

  // --- Tabla
  const cols = [
    { t: 'N°', w: 26, a: 'center' as const },
    { t: 'Salida', w: 78, a: 'center' as const },
    { t: 'Comprobante', w: 92, a: 'left' as const },
    { t: 'Funcionario solicitante', w: 150, a: 'left' as const },
    { t: 'Unidad / Área', w: 120, a: 'left' as const },
    { t: 'Dev. estimada', w: 66, a: 'center' as const },
    { t: 'Devuelto el', w: 78, a: 'center' as const },
    { t: 'Estado', w: 60, a: 'center' as const },
  ];
  const resto = ancho - cols.reduce((n, c) => n + c.w, 0);
  (cols[4] as { w: number }).w += resto; // la unidad absorbe el sobrante
  const fs = 8;
  const pad = 3;

  const alto = (celdas: string[]) =>
    Math.max(
      ...celdas.map((txt, i) =>
        doc
          .font('Helvetica')
          .fontSize(fs)
          .heightOfString(txt, {
            width: (cols[i] as { w: number }).w - pad * 2,
          }),
      ),
    ) +
    pad * 2;

  const fila = (celdas: string[], y: number, h: number, cab = false) => {
    let x = izq;
    cols.forEach((c, i) => {
      if (cab) doc.rect(x, y, c.w, h).fillAndStroke('#e5e7eb', '#000');
      else doc.rect(x, y, c.w, h).lineWidth(0.5).stroke('#000');
      doc
        .fillColor('#000')
        .font(cab ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(fs)
        .text(celdas[i] as string, x + pad, y + pad, {
          width: c.w - pad * 2,
          align: cab ? 'center' : c.a,
        });
      x += c.w;
    });
  };

  const cabecera = cols.map((c) => c.t);
  let y = doc.y;
  fila(cabecera, y, 16, true);
  y += 16;

  let pendientes = 0;
  let vencidos = 0;
  const hoyIso = new Date().toISOString().slice(0, 10);
  filas.forEach((p, i) => {
    const c = p.comprobante;
    const ident = identificadorC31(c, `#${p.comprobanteId}`);
    const tipo = c?.tipoC31 === 'SIN_IMPUTACION' ? 'Dev.' : 'Prev.';
    const f = p.funcionario;
    const nombre = f
      ? `${f.nombres} ${f.apellidos}`
      : (p.solicitante?.nombreCompleto ?? '—');
    const vencido =
      !p.devuelto &&
      !!p.fechaDevolucionEstimada &&
      String(p.fechaDevolucionEstimada).slice(0, 10) < hoyIso;
    if (!p.devuelto) pendientes++;
    if (vencido) vencidos++;
    const celdas = [
      String(i + 1),
      fechaHora(p.fechaHoraSalida),
      `${tipo} ${ident} / ${c?.gestion ?? ''}`,
      f ? `${nombre}${f.cargo ? ` (${f.cargo})` : ''}` : nombre,
      p.areaUnidad ?? '—',
      soloFecha(p.fechaDevolucionEstimada),
      p.devuelto ? fechaHora(p.fechaHoraDevolucion) : '—',
      p.devuelto
        ? p.condicionDevolucion === 'CON_NOVEDAD'
          ? 'Devuelto (novedad)'
          : 'Devuelto'
        : vencido
          ? 'Vencido'
          : 'Pendiente',
    ];
    const h = alto(celdas);
    if (y + h > limiteY()) {
      doc.addPage();
      y = doc.page.margins.top;
      fila(cabecera, y, 16, true);
      y += 16;
    }
    fila(celdas, y, h);
    y += h;
  });

  if (filas.length === 0) {
    doc
      .font('Helvetica-Oblique')
      .fontSize(10)
      .text('No hay préstamos que coincidan con los filtros.', izq, y + 10, {
        width: ancho,
        align: 'center',
      });
    y += 30;
  }

  // --- Totales
  if (y + 30 > limiteY()) {
    doc.addPage();
    y = doc.page.margins.top;
  }
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(
      `Total: ${filas.length}   |   Devueltos: ${filas.length - pendientes}   |   Pendientes: ${pendientes} (vencidos: ${vencidos})`,
      izq,
      y + 10,
      { width: ancho, align: 'right' },
    );

  // --- Pie con numeración de páginas
  const rango = doc.bufferedPageRange();
  for (let i = 0; i < rango.count; i++) {
    doc.switchToPage(rango.start + i);
    // El pie va dentro del margen inferior: sin esto pdfkit agrega hojas vacías
    doc.page.margins.bottom = 0;
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#444')
      .text(
        `Emitido por ${emisor || '—'} el ${fechaHora(new Date())}   —   Página ${i + 1} de ${rango.count}`,
        izq,
        doc.page.height - 32,
        { width: ancho, align: 'center', lineBreak: false },
      );
  }
  doc.end();

  return new Promise((resolve) =>
    doc.on('end', () => resolve(Buffer.concat(partes))),
  );
}
