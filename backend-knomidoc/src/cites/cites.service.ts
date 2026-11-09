import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createReadStream, existsSync } from 'fs';
import { mkdir, rename, unlink, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import type { Express } from 'express';
import * as ExcelJS from 'exceljs';
import { Repository } from 'typeorm';
import {
  coincideFirma,
  MAX_ADJUNTO_BYTES,
  TIPOS_PERMITIDOS,
} from '../uploads/c31-adjuntos.service';
import { Usuario } from '../usuarios/entities/usuario.entity';
import {
  AnularCiteDto,
  CreateCiteDto,
  FiltroCiteDto,
  UpdateCiteDto,
} from './dto/cite.dto';
import { CiteAdjunto } from './entities/cite-adjunto.entity';
import { Cite, TipoCite } from './entities/cite.entity';

/** Carpeta PRIVADA de los respaldos de CITE (se sirven solo con sesión). */
export const CITES_STORAGE_DIR = resolve(
  process.env.CITES_STORAGE_DIR ?? './storage/cites',
);
export { MAX_ADJUNTO_BYTES };

const hoy = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });

@Injectable()
export class CitesService {
  constructor(
    @InjectRepository(Cite) private readonly repo: Repository<Cite>,
    @InjectRepository(CiteAdjunto)
    private readonly adjuntos: Repository<CiteAdjunto>,
  ) {}

  /** GAMSL/ARCH/AUD/OF-N° 004/2026: serie propia, correlativo por serie y gestión (prefijo: CITE_PREFIJO). */
  private async siguiente(tipo: TipoCite, gestion: number) {
    const r = await this.repo
      .createQueryBuilder('c')
      .select('COALESCE(MAX(c.correlativo), 0)', 'max')
      .where('c.direccion = :d AND c.tipo = :t AND c.gestion = :g', {
        d: 'EMITIDO',
        t: tipo,
        g: gestion,
      })
      .getRawOne<{ max: string }>();
    const n = Number(r?.max ?? 0) + 1;
    const prefijo = process.env.CITE_PREFIJO ?? 'GAMSL/ARCH';
    return {
      n,
      cite: `${prefijo}/${tipo}/OF-N° ${String(n).padStart(3, '0')}/${gestion}`,
    };
  }

  async create(
    dto: CreateCiteDto,
    usuario?: Usuario,
    origen = { origen: 'MANUAL', origenId: null as number | null },
  ) {
    const fecha = dto.fecha ?? hoy();
    const gestion = Number(fecha.slice(0, 4));
    const tipo = (dto.tipo ?? 'OF') as TipoCite;
    let cite = dto.cite?.trim() ?? '';
    let correlativo: number | null = null;
    if (dto.direccion === 'RECIBIDO' && !cite)
      throw new BadRequestException('Escriba el CITE del documento recibido');
    if (dto.direccion === 'EMITIDO' && !cite) {
      const s = await this.siguiente(tipo, gestion);
      cite = s.cite;
      correlativo = s.n;
    }
    if (await this.repo.existsBy({ direccion: dto.direccion, cite }))
      throw new ConflictException(`El CITE ${cite} ya está registrado`);
    return this.repo.save(
      this.repo.create({
        ...dto,
        tipo,
        cite,
        fecha,
        gestion,
        correlativo,
        cargoContraparte: dto.cargoContraparte ?? null,
        referencia: dto.referencia ?? null,
        observaciones: dto.observaciones ?? null,
        estado: 'REGISTRADO',
        origen: origen.origen,
        origenId: origen.origenId,
        creadoPorId: usuario?.id,
      }),
    );
  }

  /** Lo usan otros módulos (notas a Auditoría, solicitudes) para dejar su CITE en el libro. */
  async registrarSiNoExiste(
    dto: CreateCiteDto,
    origen: string,
    origenId: number,
    usuario?: Usuario,
  ) {
    if (!dto.cite) return null;
    if (await this.repo.existsBy({ direccion: dto.direccion, cite: dto.cite }))
      return null;
    return this.create(dto, usuario, { origen, origenId });
  }

  async findAll(f: FiltroCiteDto) {
    const page = Math.max(1, f.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, f.pageSize ?? 25));
    const qb = this.repo
      .createQueryBuilder('c')
      .loadRelationIdAndMap('c.totalAdjuntos', 'c.adjuntos');
    if (f.gestion) qb.andWhere('c.gestion = :g', { g: f.gestion });
    if (f.direccion) qb.andWhere('c.direccion = :d', { d: f.direccion });
    if (f.tipo) qb.andWhere('c.tipo = :t', { t: f.tipo });
    if (f.search?.trim())
      qb.andWhere(
        '(c.cite ILIKE :s OR c.asunto ILIKE :s OR c.contraparte ILIKE :s OR c.referencia ILIKE :s)',
        {
          s: `%${f.search.trim()}%`,
        },
      );
    const [data, total] = await qb
      .orderBy('c.fecha', 'DESC')
      .addOrderBy('c.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { data, total, page, pageSize };
  }

  async exportarPlanilla(f: FiltroCiteDto): Promise<Buffer> {
    const qb = this.repo.createQueryBuilder('c');
    if (f.gestion) qb.andWhere('c.gestion = :g', { g: f.gestion });
    if (f.direccion) qb.andWhere('c.direccion = :d', { d: f.direccion });
    if (f.tipo) qb.andWhere('c.tipo = :t', { t: f.tipo });
    if (f.search?.trim())
      qb.andWhere(
        '(c.cite ILIKE :s OR c.asunto ILIKE :s OR c.contraparte ILIKE :s OR c.referencia ILIKE :s)',
        {
          s: `%${f.search.trim()}%`,
        },
      );
    const filas = await qb
      .orderBy('c.direccion', 'ASC')
      .addOrderBy('c.tipo', 'ASC')
      .addOrderBy('c.correlativo', 'ASC')
      .addOrderBy('c.fecha', 'ASC')
      .getMany();
    const libro = new ExcelJS.Workbook();
    const hoja = libro.addWorksheet('CITEs');
    hoja.columns = [
      { header: 'N° CITE', key: 'n', width: 34 },
      { header: 'FECHA', key: 'fecha', width: 13 },
      { header: 'SERIE', key: 'serie', width: 9 },
      { header: 'DESTINATARIO', key: 'dest', width: 38 },
      { header: 'REFERENCIA', key: 'ref', width: 60 },
    ];
    hoja.getRow(1).font = { bold: true };
    for (const c of filas) {
      const [y, m, d] = String(c.fecha).slice(0, 10).split('-');
      hoja.addRow({
        n: `${c.cite}${c.direccion === 'RECIBIDO' ? ' (recibido)' : ''}${c.estado === 'ANULADO' ? ' [ANULADO]' : ''}`,
        fecha: `${d}/${m}/${y}`,
        serie: c.tipo,
        dest: c.contraparte,
        ref: c.asunto,
      });
    }
    return Buffer.from(await libro.xlsx.writeBuffer());
  }

  async findOne(id: number) {
    const c = await this.repo.findOne({
      where: { id },
      relations: { adjuntos: true },
    });
    if (!c) throw new NotFoundException('CITE no encontrado');
    return c;
  }

  async update(id: number, dto: UpdateCiteDto) {
    const c = await this.findOne(id);
    if (c.estado === 'ANULADO')
      throw new ConflictException('El CITE está anulado');
    if (
      dto.cite &&
      dto.cite !== c.cite &&
      (await this.repo.existsBy({ direccion: c.direccion, cite: dto.cite }))
    )
      throw new ConflictException(`El CITE ${dto.cite} ya está registrado`);
    const { adjuntos: _a, ...base } = c;
    void _a;
    const nuevo = { ...base, ...dto } as Cite;
    if (dto.fecha) nuevo.gestion = Number(dto.fecha.slice(0, 4));
    await this.repo.save(nuevo);
    await this.ordenarNombres(id).catch(() => undefined);
    return this.findOne(id);
  }

  async anular(id: number, dto: AnularCiteDto) {
    const c = await this.findOne(id);
    c.estado = 'ANULADO';
    c.motivoAnulacion = dto.motivo.trim();
    const { adjuntos: _a, ...base } = c;
    void _a;
    return this.repo.save(base as Cite);
  }

  // ── Respaldo escaneado ──
  private etiqueta(c: Cite) {
    const base =
      c.direccion === 'EMITIDO'
        ? `${c.tipo}-${c.correlativo != null ? String(c.correlativo).padStart(3, '0') : c.id}`
        : `REC-${c.id}`;
    return `${c.direccion === 'EMITIDO' ? 'emitidos' : 'recibidos'}/${c.gestion}/${base}`;
  }

  async subir(id: number, archivos: Express.Multer.File[], usuario?: Usuario) {
    const c = await this.findOne(id);
    if (!archivos?.length)
      throw new BadRequestException('No se envió ningún archivo');
    for (const a of archivos) {
      if (!a.buffer?.length || !coincideFirma(a.buffer, a.mimetype))
        throw new BadRequestException(
          `«${a.originalname}» no es un PDF o imagen válido (PDF, JPG, PNG o WEBP)`,
        );
    }
    for (const a of archivos) {
      const ext = TIPOS_PERMITIDOS[a.mimetype]!.ext;
      const provisional = join(
        this.etiqueta(c),
        `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`,
      );
      const ruta = join(CITES_STORAGE_DIR, provisional);
      await mkdir(dirname(ruta), { recursive: true });
      await writeFile(ruta, a.buffer);
      await this.adjuntos.save(
        this.adjuntos.create({
          citeId: id,
          nombreOriginal: a.originalname.slice(0, 255),
          nombreArchivo: provisional,
          mimeType: a.mimetype,
          tamano: a.size ?? a.buffer.length,
          subidoPorId: usuario?.id ?? null,
        }),
      );
    }
    await this.ordenarNombres(id);
    return this.findOne(id);
  }

  /** 2026_OF-004_parte-1-de-2.pdf, dentro de emitidos/2026/OF-004/. */
  private async ordenarNombres(id: number) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) return;
    const lista = await this.adjuntos.find({
      where: { citeId: id },
      order: { id: 'ASC' },
    });
    const carpeta = this.etiqueta(c);
    const etiq = carpeta.split('/').pop() as string;
    for (const [i, a] of lista.entries()) {
      const actual = a.nombreArchivo as string;
      const ext = actual.slice(actual.lastIndexOf('.'));
      const nombre = `${c.gestion}_${etiq}_parte-${i + 1}-de-${lista.length}${ext}`;
      const rel = join(carpeta, nombre);
      if (rel !== actual) {
        const destino = join(CITES_STORAGE_DIR, rel);
        await mkdir(dirname(destino), { recursive: true });
        // Dos pasos: evita pisar un archivo que aún conserva el nombre antiguo
        const paso = `${destino}.mv`;
        await rename(join(CITES_STORAGE_DIR, actual), paso);
        await rename(paso, destino);
        a.nombreArchivo = rel;
      }
      a.nombreOriginal = nombre;
      await this.adjuntos.save(a);
    }
  }

  async abrir(id: number, adjuntoId: number) {
    const a = await this.adjuntos.findOne({
      where: { id: adjuntoId, citeId: id },
    });
    if (!a) throw new NotFoundException('Archivo no encontrado');
    const ruta = join(CITES_STORAGE_DIR, a.nombreArchivo as string);
    if (!existsSync(ruta))
      throw new NotFoundException('El archivo ya no está en el servidor');
    return { adjunto: a, stream: createReadStream(ruta) };
  }

  async eliminarAdjunto(id: number, adjuntoId: number) {
    const a = await this.adjuntos.findOne({
      where: { id: adjuntoId, citeId: id },
    });
    if (!a) throw new NotFoundException('Archivo no encontrado');
    await this.adjuntos.remove(a);
    await unlink(join(CITES_STORAGE_DIR, a.nombreArchivo as string)).catch(
      () => undefined,
    );
    await this.ordenarNombres(id).catch(() => undefined);
  }
}
