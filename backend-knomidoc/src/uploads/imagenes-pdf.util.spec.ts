/**
 * imagenesAPdf(): conversión de imágenes a PDF con pdfkit (mockeado).
 *
 * `sharp` es una dependencia OPCIONAL del proyecto (no está en package.json):
 * el util intenta usarla y, si no está, trabaja con las imágenes tal cual.
 * Aquí se verifica ese camino sin sharp y la geometría de las páginas.
 *
 * El "pdfkit" falso representa cada imagen con el texto "<ancho>x<alto>".
 */
import { imagenesAPdf } from './imagenes-pdf.util';

interface PaginaFalsa {
  size: number[];
  imagen?: { buf: Buffer; x: number; y: number; width: number; height: number };
}
const mockPaginas: PaginaFalsa[] = [];

jest.mock('pdfkit', () => ({
  __esModule: true,
  default: class PdfFalso {
    private manejadores: Record<string, (a?: unknown) => void> = {};
    on(evento: string, cb: (a?: unknown) => void) {
      this.manejadores[evento] = cb;
      return this;
    }
    openImage(buf: Buffer) {
      const texto = buf.toString();
      if (texto === 'corrupta') throw new Error('Unknown image format.');
      const [width, height] = texto.split('x').map(Number);
      return { width, height };
    }
    addPage(opciones: { size: number[] }) {
      mockPaginas.push({ size: opciones.size });
    }
    image(
      buf: Buffer,
      x: number,
      y: number,
      o: { width: number; height: number },
    ) {
      mockPaginas[mockPaginas.length - 1].imagen = { buf, x, y, ...o };
    }
    end() {
      this.manejadores.data?.(Buffer.from('%PDF-1.7 falso'));
      this.manejadores.end?.();
    }
  },
}));

const A4 = { ancho: 595.28, alto: 841.89 };
const img = (ancho: number, alto: number) => Buffer.from(`${ancho}x${alto}`);

describe('imagenesAPdf()', () => {
  beforeEach(() => {
    mockPaginas.length = 0;
  });

  it('devuelve un Buffer con cabecera PDF', async () => {
    const pdf = await imagenesAPdf([img(800, 1000)]);
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('crea UNA página por imagen, en el orden recibido', async () => {
    await imagenesAPdf([img(100, 200), img(300, 400), img(500, 600)]);

    expect(mockPaginas).toHaveLength(3);
    expect(mockPaginas.map((p) => p.imagen?.buf.toString())).toEqual([
      '100x200',
      '300x400',
      '500x600',
    ]);
  });

  it('foto vertical → página A4 vertical; foto horizontal → A4 apaisada', async () => {
    await imagenesAPdf([img(800, 1000), img(1000, 800)]);

    expect(mockPaginas[0].size).toEqual([A4.ancho, A4.alto]);
    expect(mockPaginas[1].size).toEqual([A4.alto, A4.ancho]);
  });

  it('escala sin deformar y centra la imagen dentro de la página', async () => {
    await imagenesAPdf([img(2000, 4000)]);
    const { imagen, size } = mockPaginas[0];
    const [pw, ph] = size;

    // Misma proporción que la original (2:4)
    expect(imagen!.width / imagen!.height).toBeCloseTo(0.5, 5);
    // Cabe dentro de la página
    expect(imagen!.width).toBeLessThanOrEqual(pw);
    expect(imagen!.height).toBeLessThanOrEqual(ph);
    // Centrada
    expect(imagen!.x).toBeCloseTo((pw - imagen!.width) / 2, 5);
    expect(imagen!.y).toBeCloseTo((ph - imagen!.height) / 2, 5);
  });

  it('sin sharp instalado usa la imagen original (no falla)', async () => {
    await imagenesAPdf([img(640, 480)]);
    // openImage recibió el buffer original: si sharp hubiera "optimizado", sería otro
    expect(mockPaginas[0].imagen!.buf.toString()).toBe('640x480');
  });

  it('una imagen dañada hace fallar la conversión (el servicio lo traduce a 400)', async () => {
    await expect(
      imagenesAPdf([img(10, 10), Buffer.from('corrupta')]),
    ).rejects.toThrow('Unknown image format.');
  });

  it('sin imágenes genera un PDF sin páginas', async () => {
    const pdf = await imagenesAPdf([]);
    expect(mockPaginas).toHaveLength(0);
    expect(pdf.length).toBeGreaterThan(0);
  });
});
