import PDFDocument from 'pdfkit';

const A4_ANCHO = 595.28;
const A4_ALTO = 841.89;
const MARGEN = 20;

/** Lado mayor máximo (px) al reducir fotos de celular; suficiente para leer un C31 impreso. */
const LADO_MAX_PX = 2000;
const CALIDAD_JPEG = 80;

/**
 * Optimización previa OPCIONAL con `sharp` (corrige la rotación EXIF, reduce el
 * tamaño y pasa a JPEG). Si `sharp` no está instalado se usan las imágenes tal
 * cual (el frontend ya las comprime antes de enviarlas).
 */
async function optimizar(buffer: Buffer): Promise<Buffer> {
  try {
    const nombre = 'sharp';
    const mod = (await import(nombre)) as {
      default?: (b: Buffer) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
    };
    const sharp = mod.default ?? (mod as unknown as (b: Buffer) => any); // eslint-disable-line @typescript-eslint/no-explicit-any
    return (await sharp(buffer)
      .rotate()
      .resize({
        width: LADO_MAX_PX,
        height: LADO_MAX_PX,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: CALIDAD_JPEG, mozjpeg: true })
      .toBuffer()) as Buffer;
  } catch {
    return buffer;
  }
}

/**
 * Une las imágenes, en el orden recibido, en un solo PDF: una página A4 por
 * imagen (vertical u horizontal según la foto), centrada y sin deformarse.
 */
export async function imagenesAPdf(imagenes: Buffer[]): Promise<Buffer> {
  const doc = new PDFDocument({ autoFirstPage: false, compress: true });
  const trozos: Buffer[] = [];
  doc.on('data', (t: Buffer) => trozos.push(t));
  const terminado = new Promise<Buffer>((ok, mal) => {
    doc.on('end', () => ok(Buffer.concat(trozos)));
    doc.on('error', mal);
  });

  for (const original of imagenes) {
    const buf = await optimizar(original);
    const img = (doc as any).openImage(buf);
    const horizontal = img.width > img.height;
    const pw = horizontal ? A4_ALTO : A4_ANCHO;
    const ph = horizontal ? A4_ANCHO : A4_ALTO;
    doc.addPage({ size: [pw, ph], margin: 0 });
    const escala = Math.min(
      (pw - MARGEN * 2) / img.width,
      (ph - MARGEN * 2) / img.height,
    );
    const w = img.width * escala;
    const h = img.height * escala;
    doc.image(buf, (pw - w) / 2, (ph - h) / 2, { width: w, height: h });
  }

  doc.end();
  return terminado;
}
