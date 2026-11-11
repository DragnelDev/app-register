/**
 * Módulo de digitalización (C31AdjuntosService).
 *
 * Qué se verifica:
 *  - Validación por FIRMA DE BYTES: un .exe disfrazado de imagen/PDF se rechaza
 *    aunque el cliente declare un mimetype permitido.
 *  - Límites: máx. 40 imágenes, 80 MB en total (el límite de 15 MB por archivo
 *    lo aplica multer en el controlador: ver test/digitalizacion.e2e-spec.ts).
 *  - Orden de las imágenes al armar el PDF.
 *  - Nada se escribe en disco cuando la validación falla.
 *
 * La conversión real a PDF (pdfkit/sharp) y el sistema de archivos se mockean.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  C31AdjuntosService,
  MAX_IMAGENES_DIGITALIZACION,
  MAX_TOTAL_DIGITALIZACION,
  coincideFirma,
  etiquetaArchivo,
} from './c31-adjuntos.service';
import { TipoAdjuntoC31 } from './entities/c31-adjunto.entity';
import { imagenesAPdf } from './imagenes-pdf.util';
import { writeFile, mkdir, unlink } from 'fs/promises';

jest.mock('./imagenes-pdf.util', () => ({ imagenesAPdf: jest.fn() }));
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
  rename: jest.fn().mockResolvedValue(undefined),
}));

const MB = 1024 * 1024;

/** Cabeceras reales ("firmas") de cada formato. */
const FIRMA = {
  jpg: [0xff, 0xd8, 0xff, 0xe0],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a],
  pdf: [0x25, 0x50, 0x44, 0x46, 0x2d],
  exe: [0x4d, 0x5a, 0x90, 0x00], // "MZ": ejecutable de Windows
};

const archivo = (
  firma: number[],
  mimetype: string,
  opciones: { nombre?: string; size?: number } = {},
): Express.Multer.File => {
  const buffer = Buffer.from([...firma, 1, 2, 3, 4]);
  return {
    buffer,
    mimetype,
    originalname: opciones.nombre ?? 'archivo',
    size: opciones.size ?? buffer.length,
  } as Express.Multer.File;
};

describe('C31AdjuntosService', () => {
  let service: C31AdjuntosService;
  let repo: { findOne: jest.Mock; find: jest.Mock; save: jest.Mock };
  let manager: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    manager = {
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        gestion: 2026,
        preventivos: [],
        devengados: [],
      }),
      create: jest.fn((_e, d) => ({ ...d })),
      save: jest.fn(async (_e, d) => ({ ...d, id: 10 })),
      update: jest.fn(),
    };
    repo = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 10, tipo: TipoAdjuntoC31.RESPALDO }),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
    };
    const dataSource = {
      manager,
      transaction: async (cb: (m: unknown) => unknown) => cb(manager),
    };
    service = new C31AdjuntosService(repo as any, dataSource as any);
    (imagenesAPdf as jest.Mock).mockResolvedValue(
      Buffer.from('%PDF-1.7 generado'),
    );
  });

  describe('coincideFirma()', () => {
    it('acepta cabeceras que corresponden al tipo declarado', () => {
      expect(coincideFirma(Buffer.from(FIRMA.jpg), 'image/jpeg')).toBe(true);
      expect(coincideFirma(Buffer.from(FIRMA.png), 'image/png')).toBe(true);
      expect(coincideFirma(Buffer.from(FIRMA.pdf), 'application/pdf')).toBe(
        true,
      );
    });

    it('rechaza un ejecutable declarado como imagen o PDF', () => {
      const exe = Buffer.from(FIRMA.exe);
      expect(coincideFirma(exe, 'image/png')).toBe(false);
      expect(coincideFirma(exe, 'image/jpeg')).toBe(false);
      expect(coincideFirma(exe, 'application/pdf')).toBe(false);
    });

    it('rechaza un PNG que se hace pasar por JPEG', () => {
      expect(coincideFirma(Buffer.from(FIRMA.png), 'image/jpeg')).toBe(false);
    });

    it('rechaza mimetypes fuera de la lista blanca', () => {
      expect(
        coincideFirma(Buffer.from(FIRMA.exe), 'application/x-msdownload'),
      ).toBe(false);
      expect(coincideFirma(Buffer.from(FIRMA.pdf), 'text/html')).toBe(false);
    });

    it('un buffer vacío o demasiado corto no coincide', () => {
      expect(coincideFirma(Buffer.alloc(0), 'application/pdf')).toBe(false);
      expect(coincideFirma(Buffer.from([0xff]), 'image/jpeg')).toBe(false);
    });
  });

  describe('etiquetaArchivo()', () => {
    it.each([
      ['PREV 8 - DEV 7', 'PREV-8_DEV-7'],
      ['PREV 11 / 12', 'PREV-11+12'],
      ['PREV 3', 'PREV-3'],
    ])('%s → %s', (rotulo, esperado) => {
      expect(etiquetaArchivo(rotulo)).toBe(esperado);
    });

    it('elimina caracteres peligrosos para un nombre de archivo (path traversal)', () => {
      expect(etiquetaArchivo('../../etc/passwd')).not.toMatch(/[./\\]/);
    });
  });

  describe('subir()', () => {
    it('rechaza un .exe disfrazado de PDF (400) y NO escribe nada en disco', async () => {
      const falso = archivo(FIRMA.exe, 'application/pdf', {
        nombre: 'factura.pdf',
      });

      await expect(
        service.subir(1, falso, TipoAdjuntoC31.RESPALDO),
      ).rejects.toThrow(/no corresponde a su formato/);

      expect(writeFile).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('rechaza un .exe disfrazado de imagen PNG', async () => {
      const falso = archivo(FIRMA.exe, 'image/png', { nombre: 'foto.png' });
      await expect(
        service.subir(1, falso, TipoAdjuntoC31.RESPALDO),
      ).rejects.toThrow(BadRequestException);
      expect(writeFile).not.toHaveBeenCalled();
    });

    it('rechaza un mimetype no permitido (400)', async () => {
      const exe = archivo(FIRMA.exe, 'application/x-msdownload', {
        nombre: 'setup.exe',
      });
      await expect(
        service.subir(1, exe, TipoAdjuntoC31.RESPALDO),
      ).rejects.toThrow(/Formato no permitido/);
      expect(writeFile).not.toHaveBeenCalled();
    });

    it('rechaza una petición sin archivo o con archivo vacío', async () => {
      await expect(
        service.subir(1, undefined, TipoAdjuntoC31.C31),
      ).rejects.toThrow(/No se envió ningún archivo/);
      const vacio = {
        buffer: Buffer.alloc(0),
        mimetype: 'application/pdf',
      } as Express.Multer.File;
      await expect(service.subir(1, vacio, TipoAdjuntoC31.C31)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rechaza si el comprobante no existe (404) antes de escribir en disco', async () => {
      manager.findOne.mockResolvedValue(null);
      await expect(
        service.subir(
          99,
          archivo(FIRMA.pdf, 'application/pdf'),
          TipoAdjuntoC31.RESPALDO,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(writeFile).not.toHaveBeenCalled();
    });

    it('guarda un PDF válido con nombre aleatorio (nunca el original) y registra el adjunto', async () => {
      const pdf = archivo(FIRMA.pdf, 'application/pdf', {
        nombre: '../../evil.pdf',
      });

      await service.subir(1, pdf, TipoAdjuntoC31.RESPALDO);

      expect(writeFile).toHaveBeenCalledTimes(1);
      const [ruta] = (writeFile as jest.Mock).mock.calls[0];
      expect(ruta).toMatch(/[0-9a-f-]{36}\.pdf$/);
      expect(ruta).not.toContain('evil');
      expect(manager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          comprobanteId: 1,
          mimeType: 'application/pdf',
        }),
      );
    });

    it('si falla el registro en BD, borra el archivo ya escrito (sin huérfanos)', async () => {
      manager.save.mockRejectedValue(new Error('BD caída'));

      await expect(
        service.subir(
          1,
          archivo(FIRMA.pdf, 'application/pdf'),
          TipoAdjuntoC31.RESPALDO,
        ),
      ).rejects.toThrow('BD caída');

      expect(writeFile).toHaveBeenCalledTimes(1);
      expect(unlink).toHaveBeenCalledTimes(1);
      expect((unlink as jest.Mock).mock.calls[0][0]).toBe(
        (writeFile as jest.Mock).mock.calls[0][0],
      );
    });
  });

  describe('digitalizar() · límites', () => {
    const jpg = (i = 0, size?: number) =>
      archivo([...FIRMA.jpg, i], 'image/jpeg', {
        nombre: `foto-${i}.jpg`,
        size,
      });

    it('exige al menos una imagen', async () => {
      await expect(
        service.digitalizar(1, [], TipoAdjuntoC31.C31),
      ).rejects.toThrow(/al menos una imagen/);
      await expect(
        service.digitalizar(1, undefined, TipoAdjuntoC31.C31),
      ).rejects.toThrow(BadRequestException);
    });

    it(`acepta ${MAX_IMAGENES_DIGITALIZACION} imágenes y rechaza ${MAX_IMAGENES_DIGITALIZACION + 1}`, async () => {
      const cuarenta = Array.from(
        { length: MAX_IMAGENES_DIGITALIZACION },
        (_, i) => jpg(i),
      );
      await expect(
        service.digitalizar(1, cuarenta, TipoAdjuntoC31.RESPALDO),
      ).resolves.toMatchObject({ ok: true, paginas: 40 });

      const cuarentaYUna = [...cuarenta, jpg(41)];
      await expect(
        service.digitalizar(1, cuarentaYUna, TipoAdjuntoC31.RESPALDO),
      ).rejects.toThrow(/Máximo 40 imágenes/);
    });

    it('rechaza cuando el peso total supera 80 MB (400)', async () => {
      // 6 × 14 MB = 84 MB: cada una cabe en el límite de 15 MB, el conjunto no
      const pesadas = Array.from({ length: 6 }, (_, i) => jpg(i, 14 * MB));

      await expect(
        service.digitalizar(1, pesadas, TipoAdjuntoC31.RESPALDO),
      ).rejects.toThrow(/supera 80 MB/);
      expect(imagenesAPdf).not.toHaveBeenCalled();
    });

    it('acepta exactamente 80 MB en total (límite inclusivo)', async () => {
      const exactas = Array.from({ length: 8 }, (_, i) => jpg(i, 10 * MB));
      expect(8 * 10 * MB).toBe(MAX_TOTAL_DIGITALIZACION);

      await expect(
        service.digitalizar(1, exactas, TipoAdjuntoC31.RESPALDO),
      ).resolves.toMatchObject({ ok: true });
    });

    it('rechaza 80 MB + 1 byte', async () => {
      const archivos = [jpg(0, 80 * MB), jpg(1, 1)];
      await expect(
        service.digitalizar(1, archivos, TipoAdjuntoC31.RESPALDO),
      ).rejects.toThrow(/supera 80 MB/);
    });
  });

  describe('digitalizar() · validación de contenido', () => {
    it('rechaza un .exe disfrazado de PNG y NO genera el PDF', async () => {
      const buenas = archivo([...FIRMA.jpg], 'image/jpeg', {
        nombre: 'ok.jpg',
      });
      const maliciosa = archivo(FIRMA.exe, 'image/png', {
        nombre: 'virus.png',
      });

      await expect(
        service.digitalizar(1, [buenas, maliciosa], TipoAdjuntoC31.C31),
      ).rejects.toThrow(/virus\.png.*no es una imagen válida/);

      expect(imagenesAPdf).not.toHaveBeenCalled();
      expect(writeFile).not.toHaveBeenCalled();
    });

    it('solo admite JPG o PNG: un PDF o un WEBP se rechaza en esta ruta', async () => {
      await expect(
        service.digitalizar(
          1,
          [archivo(FIRMA.pdf, 'application/pdf')],
          TipoAdjuntoC31.C31,
        ),
      ).rejects.toThrow(/solo se admiten imágenes JPG o PNG/);
      await expect(
        service.digitalizar(
          1,
          [archivo([0x52, 0x49, 0x46, 0x46], 'image/webp')],
          TipoAdjuntoC31.C31,
        ),
      ).rejects.toThrow(/solo se admiten imágenes JPG o PNG/);
    });

    it('rechaza una imagen con buffer vacío', async () => {
      const vacia = {
        buffer: Buffer.alloc(0),
        mimetype: 'image/png',
        originalname: 'v.png',
        size: 0,
      } as Express.Multer.File;
      await expect(
        service.digitalizar(1, [vacia], TipoAdjuntoC31.C31),
      ).rejects.toThrow(/no es una imagen válida/);
    });
  });

  describe('digitalizar() · generación del PDF', () => {
    it('une las imágenes EN EL ORDEN RECIBIDO', async () => {
      const a = archivo([...FIRMA.jpg, 0xa1], 'image/jpeg');
      const b = archivo(FIRMA.png, 'image/png');
      const c = archivo([...FIRMA.jpg, 0xc3], 'image/jpeg');

      await service.digitalizar(1, [a, b, c], TipoAdjuntoC31.RESPALDO);

      expect(imagenesAPdf).toHaveBeenCalledWith([a.buffer, b.buffer, c.buffer]);
    });

    it('devuelve el N° de páginas, el adjunto y la URL de descarga', async () => {
      const r = await service.digitalizar(
        1,
        [archivo(FIRMA.jpg, 'image/jpeg'), archivo(FIRMA.png, 'image/png')],
        TipoAdjuntoC31.RESPALDO,
      );

      expect(r.ok).toBe(true);
      expect(r.paginas).toBe(2);
      expect(r.url).toBe('uploads/c31/1/10/archivo');
    });

    it('guarda el resultado como PDF (application/pdf)', async () => {
      await service.digitalizar(
        1,
        [archivo(FIRMA.jpg, 'image/jpeg')],
        TipoAdjuntoC31.RESPALDO,
      );

      expect(manager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ mimeType: 'application/pdf' }),
      );
      expect(mkdir).toHaveBeenCalled();
    });

    it('si el generador de PDF falla (imagen dañada) responde 400 y no guarda nada', async () => {
      (imagenesAPdf as jest.Mock).mockRejectedValue(
        new Error('Unknown image format'),
      );

      await expect(
        service.digitalizar(
          1,
          [archivo(FIRMA.jpg, 'image/jpeg')],
          TipoAdjuntoC31.C31,
        ),
      ).rejects.toThrow(/No se pudo generar el PDF/);

      expect(writeFile).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('comprueba que el comprobante exista ANTES de procesar las imágenes', async () => {
      manager.findOne.mockResolvedValue(null);
      await expect(
        service.digitalizar(
          77,
          [archivo(FIRMA.jpg, 'image/jpeg')],
          TipoAdjuntoC31.C31,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(imagenesAPdf).not.toHaveBeenCalled();
    });
  });
});
