import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { createReadStream, existsSync } from 'fs';
import { mkdir, rename, unlink, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import type { Express } from 'express';
import { C31Adjunto, TipoAdjuntoC31 } from './entities/c31-adjunto.entity';
import { ComprobantesC31 } from '../comprobantes_c31/entities/comprobantes_c31.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { rotuloC31 } from '../common/utils/identificador-c31.util';
import { imagenesAPdf } from './imagenes-pdf.util';
import { adjuntarRotuloGrupo } from '../common/utils/rotulo-grupo.util';

/**
 * Carpeta PRIVADA de los escaneos (fuera de /uploads, que se sirve sin login).
 * Se configura con C31_STORAGE_DIR.
 */
export const C31_STORAGE_DIR = resolve(
  process.env.C31_STORAGE_DIR ?? './storage/c31',
);

export const MAX_ADJUNTO_BYTES = 20 * 1024 * 1024;
/** Digitalización rápida (fotos → PDF) */
export const MAX_IMAGENES_DIGITALIZACION = 40;
export const MAX_IMAGEN_BYTES = 15 * 1024 * 1024;
export const MAX_TOTAL_DIGITALIZACION = 80 * 1024 * 1024;

export const TIPOS_PERMITIDOS: Record<
  string,
  { ext: string; firma: number[][] }
> = {
  'application/pdf': { ext: '.pdf', firma: [[0x25, 0x50, 0x44, 0x46]] },
  'image/jpeg': { ext: '.jpg', firma: [[0xff, 0xd8, 0xff]] },
  'image/png': { ext: '.png', firma: [[0x89, 0x50, 0x4e, 0x47]] },
  'image/webp': { ext: '.webp', firma: [[0x52, 0x49, 0x46, 0x46]] },
};

/** El tipo declarado por el cliente se contrasta con los primeros bytes reales. */
export function coincideFirma(buffer: Buffer, mime: string): boolean {
  const def = TIPOS_PERMITIDOS[mime];
  if (!def) return false;
  return def.firma.some((f) => f.every((byte, i) => buffer[i] === byte));
}

/** "PREV 8 - DEV 7" → "PREV-8_DEV-7"; "PREV 11 / 12" → "PREV-11+12". */
export function etiquetaArchivo(rotulo: string): string {
  return rotulo
    .replace(/\s*[·-]\s*/g, '_')
    .replace(/\s*\/\s*/g, '+')
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9_+-]/g, '');
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
      const guardado = await this.dataSource.transaction(async (manager) => {
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
      if (tipo === TipoAdjuntoC31.C31)
        await this.ordenarNombres(comprobanteId).catch(() => undefined);
      return (
        (await this.repo.findOne({ where: { id: guardado.id } })) ?? guardado
      );
    } catch (e) {
      await unlink(join(C31_STORAGE_DIR, nombreArchivo)).catch(() => undefined);
      throw e;
    }
  }

  /**
   * Digitalización rápida: une varias fotos/escaneos (JPG o PNG, en el orden
   * recibido) en un único PDF y lo adjunta al comprobante como cualquier otro
   * archivo (si es de tipo C31 pasa a ser el principal y marca "digitalizado").
   */
  async digitalizar(
    comprobanteId: number,
    imagenes: Express.Multer.File[] | undefined,
    tipo: TipoAdjuntoC31,
    usuario?: Usuario,
  ) {
    if (!imagenes?.length) {
      throw new BadRequestException('Seleccione al menos una imagen');
    }
    if (imagenes.length > MAX_IMAGENES_DIGITALIZACION) {
      throw new BadRequestException(
        `Máximo ${MAX_IMAGENES_DIGITALIZACION} imágenes por PDF`,
      );
    }
    const total = imagenes.reduce((s, f) => s + (f.size ?? 0), 0);
    if (total > MAX_TOTAL_DIGITALIZACION) {
      throw new BadRequestException(
        `El peso total supera ${MAX_TOTAL_DIGITALIZACION / 1024 / 1024} MB: elimine o reduzca algunas imágenes`,
      );
    }
    for (const f of imagenes) {
      if (!['image/jpeg', 'image/png'].includes(f.mimetype)) {
        throw new BadRequestException(
          `“${f.originalname}”: solo se admiten imágenes JPG o PNG`,
        );
      }
      if (!f.buffer?.length || !coincideFirma(f.buffer, f.mimetype)) {
        throw new BadRequestException(
          `“${f.originalname}” no es una imagen válida`,
        );
      }
    }
    await this.exigirComprobante(comprobanteId);

    let pdf: Buffer;
    try {
      pdf = await imagenesAPdf(imagenes.map((f) => f.buffer));
    } catch {
      throw new BadRequestException(
        'No se pudo generar el PDF: alguna imagen está dañada o tiene un formato no soportado',
      );
    }
    const nombre = `digitalizacion-${Date.now()}.pdf`;
    const adjunto = await this.subir(
      comprobanteId,
      {
        buffer: pdf,
        mimetype: 'application/pdf',
        originalname: nombre,
        size: pdf.length,
      } as Express.Multer.File,
      tipo,
      usuario,
    );
    return {
      ok: true,
      paginas: imagenes.length,
      adjunto,
      url: urlArchivo(comprobanteId, adjunto.id as number),
    };
  }

  /**
   * Los escaneos del C31 se guardan como
   *   <gestión>/<PREV-11>/<gestión>_PREV-11_parte-1-de-2.pdf
   * (unidos: <gestión>/PREV-8_DEV-7/2026_PREV-8_DEV-7_parte-1-de-1.pdf).
   * Las partes se cuentan entre todos los comprobantes unidos del grupo.
   */
  private async ordenarNombres(comprobanteId: number): Promise<void> {
    const m = this.dataSource.manager;
    const c = await m.findOne(ComprobantesC31, {
      where: { id: comprobanteId },
      relations: { preventivos: true, devengados: true },
    });
    if (!c) return;
    await adjuntarRotuloGrupo(m, c);
    const etiqueta =
      etiquetaArchivo(rotuloC31(c, `C31-${c.id}`)) || `C31-${c.id}`;
    const ids = c.grupoUnionId
      ? (
          await m.find(ComprobantesC31, {
            where: { grupoUnionId: c.grupoUnionId },
            select: { id: true },
          })
        ).map((x) => x.id as number)
      : [comprobanteId];
    const lista = await this.repo.find({
      where: { comprobanteId: In(ids), tipo: TipoAdjuntoC31.C31 },
      order: { id: 'ASC' },
    });
    const total = lista.length;
    for (const [i, a] of lista.entries()) {
      const actual = a.nombreArchivo as string;
      const ext = actual.slice(actual.lastIndexOf('.'));
      const nuevoNombre = `${c.gestion}_${etiqueta}_parte-${i + 1}-de-${total}${ext}`;
      const relativo = join(String(c.gestion), etiqueta, nuevoNombre);
      if (relativo !== actual) {
        const destino = join(C31_STORAGE_DIR, relativo);
        await mkdir(dirname(destino), { recursive: true });
        await rename(join(C31_STORAGE_DIR, actual), destino);
        a.nombreArchivo = relativo;
      }
      a.nombreOriginal = nuevoNombre;
      await this.repo.save(a);
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
    await unlink(join(C31_STORAGE_DIR, adjunto.nombreArchivo as string)).catch(
      () => undefined,
    );
    if (adjunto.tipo === TipoAdjuntoC31.C31)
      await this.ordenarNombres(comprobanteId).catch(() => undefined);
  }
}
