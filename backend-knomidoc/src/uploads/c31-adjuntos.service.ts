import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { createReadStream, existsSync } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import type { Express } from 'express';
import {
  C31Adjunto,
  TipoAdjuntoC31,
} from './entities/c31-adjunto.entity';
import { ComprobantesC31 } from '../comprobantes_c31/entities/comprobantes_c31.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

/**
 * Carpeta PRIVADA de los escaneos (fuera de /uploads, que se sirve sin login).
 * Se configura con C31_STORAGE_DIR.
 */
export const C31_STORAGE_DIR = resolve(
  process.env.C31_STORAGE_DIR ?? './storage/c31',
);

export const MAX_ADJUNTO_BYTES = 20 * 1024 * 1024;

const TIPOS_PERMITIDOS: Record<string, { ext: string; firma: number[][] }> = {
  'application/pdf': { ext: '.pdf', firma: [[0x25, 0x50, 0x44, 0x46]] },
  'image/jpeg': { ext: '.jpg', firma: [[0xff, 0xd8, 0xff]] },
  'image/png': { ext: '.png', firma: [[0x89, 0x50, 0x4e, 0x47]] },
  'image/webp': { ext: '.webp', firma: [[0x52, 0x49, 0x46, 0x46]] },
};

/** El tipo declarado por el cliente se contrasta con los primeros bytes reales. */
function coincideFirma(buffer: Buffer, mime: string): boolean {
  const def = TIPOS_PERMITIDOS[mime];
  if (!def) return false;
  return def.firma.some((f) => f.every((byte, i) => buffer[i] === byte));
}

export const urlArchivo = (comprobanteId: number, adjuntoId: number) =>
  `uploads/c31/${comprobanteId}/${adjuntoId}/archivo`;

@Injectable()
export class C31AdjuntosService {
  constructor(
    @InjectRepository(C31Adjunto)
    private readonly repo: Repository<C31Adjunto>,
    private readonly dataSource: DataSource,
  ) {}

  async listar(comprobanteId: number): Promise<C31Adjunto[]> {
    await this.exigirComprobante(comprobanteId);
    return this.repo.find({
      where: { comprobanteId },
      order: { fechaCarga: 'DESC', id: 'DESC' },
    });
  }

  private async exigirComprobante(id: number): Promise<ComprobantesC31> {
    const c = await this.dataSource.manager.findOne(ComprobantesC31, {
      where: { id },
    });
    if (!c) throw new NotFoundException('El comprobante C31 no existe');
    return c;
  }

  async subir(
    comprobanteId: number,
    archivo: Express.Multer.File | undefined,
    tipo: TipoAdjuntoC31,
    usuario?: Usuario,
  ): Promise<C31Adjunto> {
    if (!archivo?.buffer?.length) {
      throw new BadRequestException('No se envió ningún archivo válido');
    }
    if (!TIPOS_PERMITIDOS[archivo.mimetype]) {
      throw new BadRequestException(
        'Formato no permitido: solo PDF o imágenes (JPG, PNG, WEBP)',
      );
    }
    if (!coincideFirma(archivo.buffer, archivo.mimetype)) {
      throw new BadRequestException(
        'El contenido del archivo no corresponde a su formato',
      );
    }
    await this.exigirComprobante(comprobanteId);

    await mkdir(C31_STORAGE_DIR, { recursive: true });
    const nombreArchivo = `${randomUUID()}${TIPOS_PERMITIDOS[archivo.mimetype]?.ext}`;
    await writeFile(join(C31_STORAGE_DIR, nombreArchivo), archivo.buffer);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const adjunto = await manager.save(
          C31Adjunto,
          manager.create(C31Adjunto, {
            comprobanteId,
            tipo,
            // multer entrega el nombre en latin1; se pasa a UTF-8 (tildes, ñ)
            nombreOriginal: Buffer.from(archivo.originalname, 'latin1')
              .toString('utf8')
              .slice(0, 255),
            nombreArchivo,
            mimeType: archivo.mimetype,
            tamano: archivo.size,
            subidoPorId: usuario?.id ?? null,
          }),
        );
        if (tipo === TipoAdjuntoC31.C31) {
          // El último C31 escaneado pasa a ser el principal
          await manager.update(ComprobantesC31, comprobanteId, {
            archivoAdjuntoUrl: urlArchivo(comprobanteId, adjunto.id as number),
            fechaDigitalizacion: new Date(),
          });
        }
        return adjunto;
      });
    } catch (e) {
      await unlink(join(C31_STORAGE_DIR, nombreArchivo)).catch(() => undefined);
      throw e;
    }
  }

  /** Devuelve el stream del archivo y sus metadatos (solo ruta interna segura). */
  async abrir(comprobanteId: number, adjuntoId: number) {
    const adjunto = await this.repo.findOne({
      where: { id: adjuntoId, comprobanteId },
    });
    if (!adjunto) throw new NotFoundException('El archivo no existe');
    const ruta = join(C31_STORAGE_DIR, adjunto.nombreArchivo as string);
    if (!existsSync(ruta)) {
      throw new NotFoundException('El archivo ya no está en el servidor');
    }
    return { adjunto, stream: createReadStream(ruta) };
  }

  async eliminar(comprobanteId: number, adjuntoId: number): Promise<void> {
    const adjunto = await this.repo.findOne({
      where: { id: adjuntoId, comprobanteId },
    });
    if (!adjunto) throw new NotFoundException('El archivo no existe');

    await this.dataSource.transaction(async (manager) => {
      await manager.remove(C31Adjunto, adjunto);
      const c31 = await manager.findOne(ComprobantesC31, {
        where: { id: comprobanteId },
      });
      // Si era el principal, el C31 escaneado anterior (si hay) toma su lugar
      if (c31?.archivoAdjuntoUrl === urlArchivo(comprobanteId, adjuntoId)) {
        const previo = await manager.findOne(C31Adjunto, {
          where: { comprobanteId, tipo: TipoAdjuntoC31.C31 },
          order: { fechaCarga: 'DESC', id: 'DESC' },
        });
        await manager.update(ComprobantesC31, comprobanteId, {
          archivoAdjuntoUrl: previo
            ? urlArchivo(comprobanteId, previo.id as number)
            : null,
          fechaDigitalizacion: previo ? previo.fechaCarga : null,
        });
      }
    });
    await unlink(
      join(C31_STORAGE_DIR, adjunto.nombreArchivo as string),
    ).catch(() => undefined);
  }
}
