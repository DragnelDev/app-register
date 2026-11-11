/**
 * Límites de subida de la digitalización, tal como los aplica multer en el
 * controlador (C31AdjuntosController):
 *   - 15 MB por imagen        (MAX_IMAGEN_BYTES)        → 413 si se alcanza
 *   - 40 imágenes por PDF     (MAX_IMAGENES_DIGITALIZACION) → 400 si se excede
 *   - 20 MB por adjunto suelto (MAX_ADJUNTO_BYTES)       → 413 si se excede
 * El límite de 80 MB en total y la firma de bytes los valida el servicio
 * (ver src/uploads/c31-adjuntos.service.spec.ts).
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { C31AdjuntosController } from '../src/uploads/c31-adjuntos.controller';
import { C31AdjuntosService } from '../src/uploads/c31-adjuntos.service';
import { crearAppPruebas, mockServicio } from './helpers/auth-app';

const MB = 1024 * 1024;
const URL_DIG = '/api/v1/uploads/c31/1/digitalizar';
const URL_SUBIR = '/api/v1/uploads/c31/1';

/** Un JPEG "mínimo": solo importa su tamaño, el servicio está mockeado. */
const jpeg = (bytes: number) => {
  const b = Buffer.alloc(bytes, 1);
  b[0] = 0xff;
  b[1] = 0xd8;
  b[2] = 0xff;
  return b;
};

describe('Digitalización: límites de subida (Supertest)', () => {
  let app: INestApplication;
  let token: string;
  const servicio = mockServicio({
    digitalizar: jest.fn().mockResolvedValue({ ok: true, paginas: 1 }),
    subir: jest.fn().mockResolvedValue({ id: 1 }),
  });

  beforeAll(async () => {
    const r = await crearAppPruebas({
      controllers: [C31AdjuntosController],
      providers: [{ provide: C31AdjuntosService, useValue: servicio }],
    });
    app = r.app;
    token = r.tokenPara('ADMIN');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  const digitalizar = (archivos: Buffer[], campo = 'files') => {
    const req = request(app.getHttpServer())
      .post(URL_DIG)
      .set('Authorization', `Bearer ${token}`);
    archivos.forEach((b, i) =>
      req.attach(campo, b, {
        filename: `foto-${i}.jpg`,
        contentType: 'image/jpeg',
      }),
    );
    return req;
  };

  describe('POST /uploads/c31/:id/digitalizar', () => {
    // multer/busboy marcan como "truncado" un archivo que ALCANZA el límite
    // (no solo el que lo excede): el máximo efectivo es límite − 1 byte.
    it('acepta una imagen justo por debajo de 15 MB (15 MB − 1 byte)', async () => {
      const res = await digitalizar([jpeg(15 * MB - 1)]);

      expect(res.status).toBe(201);
      const [, archivos] = servicio.digitalizar.mock.calls[0];
      expect(archivos).toHaveLength(1);
      expect(archivos[0].size).toBe(15 * MB - 1);
    });

    it.each([[15 * MB], [15 * MB + 1]])(
      'rechaza una imagen de %i bytes (≥ 15 MB) con 413',
      async (bytes) => {
        const res = await digitalizar([jpeg(bytes)]);

        expect(res.status).toBe(413);
        expect(servicio.digitalizar).not.toHaveBeenCalled();
      },
    );

    it('acepta 40 imágenes y las entrega al servicio en el orden enviado', async () => {
      const lote = Array.from({ length: 40 }, (_, i) => {
        const b = jpeg(10);
        b[3] = i; // marca la posición
        return b;
      });

      const res = await digitalizar(lote);

      expect(res.status).toBe(201);
      const [, archivos] = servicio.digitalizar.mock.calls[0];
      expect(archivos).toHaveLength(40);
      expect(archivos.map((f: { buffer: Buffer }) => f.buffer[3])).toEqual(
        Array.from({ length: 40 }, (_, i) => i),
      );
    });

    it('rechaza 41 imágenes con 400 (multer: archivo inesperado)', async () => {
      const res = await digitalizar(Array.from({ length: 41 }, () => jpeg(10)));

      expect(res.status).toBe(400);
      expect(servicio.digitalizar).not.toHaveBeenCalled();
    });

    it('rechaza un campo de archivo con nombre distinto de "files" (400)', async () => {
      const res = await digitalizar([jpeg(10)], 'archivos');
      expect(res.status).toBe(400);
      expect(servicio.digitalizar).not.toHaveBeenCalled();
    });

    it('rechaza un "tipo" fuera de C31 / RESPALDO (400, ValidationPipe)', async () => {
      const res = await digitalizar([jpeg(10)]).field('tipo', 'MALWARE');
      expect(res.status).toBe(400);
      expect(servicio.digitalizar).not.toHaveBeenCalled();
    });

    it('el tipo por defecto es C31', async () => {
      await digitalizar([jpeg(10)]);
      expect(servicio.digitalizar.mock.calls[0][2]).toBe('C31');
    });

    it('un id de comprobante no numérico → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/uploads/c31/abc/digitalizar')
        .set('Authorization', `Bearer ${token}`)
        .attach('files', jpeg(10), 'a.jpg');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /uploads/c31/:id (adjunto suelto)', () => {
    it('acepta 20 MB − 1 byte y rechaza 20 MB o más con 413', async () => {
      const pdf = (n: number) => {
        const b = Buffer.alloc(n, 1);
        b.write('%PDF', 0);
        return b;
      };
      const ok = await request(app.getHttpServer())
        .post(URL_SUBIR)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', pdf(20 * MB - 1), {
          filename: 'a.pdf',
          contentType: 'application/pdf',
        });
      expect(ok.status).toBe(201);

      const grande = await request(app.getHttpServer())
        .post(URL_SUBIR)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', pdf(20 * MB), {
          filename: 'b.pdf',
          contentType: 'application/pdf',
        });
      expect(grande.status).toBe(413);
      expect(servicio.subir).toHaveBeenCalledTimes(1);
    });
  });
});
