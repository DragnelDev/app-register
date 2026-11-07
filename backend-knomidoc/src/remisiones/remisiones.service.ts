import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Remision, RemisionItem } from './entities/remision.entity';
import {
  ComprobantesC31,
  EstadoFisicoC31,
} from '../comprobantes_c31/entities/comprobantes_c31.entity';
import { registrarCambioEstado } from '../c31-historial/c31-historial.helper';
import { rotuloC31 } from '../common/utils/identificador-c31.util';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import {
  CreateRemisionDto,
  FilterRemisionesDto,
  RecibirRemisionDto,
  UpdateRemisionDto,
} from './dto/remision.dto';

const ROLES_ARCHIVO = ['ADMIN', 'OPERADOR_ARCHIVOS'];

@Injectable()
export class RemisionesService {
  constructor(
    @InjectRepository(Remision) private readonly repo: Repository<Remision>,
    @InjectRepository(RemisionItem)
    private readonly itemsRepo: Repository<RemisionItem>,
    private readonly dataSource: DataSource,
  ) {}

  private rolDe(u: Usuario) {
    return u.rolActivo ?? u.rol;
  }
  private esArchivo(u: Usuario) {
    return ROLES_ARCHIVO.includes(this.rolDe(u) as string);
  }

  private async siguienteNumero(gestion: number) {
    const [{ n }] = await this.dataSource.query<{ n: string }[]>(
      `SELECT COUNT(*)::int + 1 AS n FROM remisiones WHERE gestion = $1`,
      [gestion],
    );
    return `REM-${gestion}-${String(n).padStart(4, '0')}`;
  }

  /** C31 que se pueden remitir: en trámite y que no estén ya en otra remisión viva. */
  async candidatos(search?: string) {
    const qb = this.dataSource
      .getRepository(ComprobantesC31)
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.preventivos', 'pv')
      .leftJoinAndSelect('c.devengados', 'dv')
      .where('c.estado_fisico = :e', { e: EstadoFisicoC31.EN_TRAMITE })
      .andWhere(
        `NOT EXISTS (SELECT 1 FROM remision_items ri JOIN remisiones r ON r.id = ri.remision_id
           WHERE ri.comprobante_id = c.id AND r.estado IN ('BORRADOR','ENVIADA') AND r.fecha_eliminacion IS NULL)`,
      );
    const t = search?.trim();
    if (t) {
      qb.andWhere(
        `(pv.numero_preventivo ILIKE :t OR dv.numero_devengado ILIKE :t OR c.descripcion ILIKE :t)`,
        { t: `%${t.replace(/[%_]/g, '\\$&')}%` },
      );
    }
    const data = await qb
      .orderBy('c.id', 'DESC')
      .take(30)
      .getMany();
    return data.map((c) => ({
      id: c.id,
      identificador: rotuloC31(c, `#${c.id}`),
      gestion: c.gestion,
      montoTotal: c.montoTotal,
      descripcion: c.descripcion,
    }));
  }

  private async cargarComprobantes(ids: number[]) {
    const unicos = [...new Set(ids)];
    const cs = await this.dataSource.getRepository(ComprobantesC31).find({
      where: { id: In(unicos) },
      relations: { preventivos: true, devengados: true },
    });
    if (cs.length !== unicos.length)
      throw new BadRequestException('Algún comprobante no existe');
    for (const c of cs) {
      if (c.estadoFisico !== EstadoFisicoC31.EN_TRAMITE)
        throw new ConflictException(
          `El comprobante ${rotuloC31(c, `#${c.id}`)} no está en trámite; no se puede remitir`,
        );
      const ocupado = await this.itemsRepo
        .createQueryBuilder('ri')
        .innerJoin('ri.remision', 'r')
        .where('ri.comprobante_id = :id', { id: c.id })
        .andWhere(`r.estado IN ('BORRADOR','ENVIADA')`)
        .getCount();
      if (ocupado)
        throw new ConflictException(
          `El comprobante ${rotuloC31(c, `#${c.id}`)} ya está en otra remisión`,
        );
    }
    return unicos;
  }

  async create(dto: CreateRemisionDto, usuario: Usuario) {
    const ids = await this.cargarComprobantes(dto.comprobanteIds ?? []);
    const gestion = new Date().getFullYear();
    const saved = await this.dataSource.transaction(async (m) => {
      const r = await m.save(
        Remision,
        m.create(Remision, {
          numeroRemision: await this.siguienteNumero(gestion),
          gestion,
          estado: dto.enviar ? 'ENVIADA' : 'BORRADOR',
          unidadRemitente: dto.unidadRemitente ?? null,
          observacion: dto.observacion ?? null,
          remitenteId: usuario.id,
          creadoPorId: usuario.id,
          fechaEnvio: dto.enviar ? new Date() : null,
        }),
      );
      await m.save(
        RemisionItem,
        ids.map((comprobanteId) =>
          m.create(RemisionItem, { remisionId: r.id, comprobanteId }),
        ),
      );
      return r;
    });
    return this.findOne(saved.id as number, usuario);
  }

  private async obtener(id: number, usuario: Usuario) {
    const r = await this.repo.findOne({
      where: { id },
      relations: {
        remitente: true,
        receptor: true,
        items: { comprobante: { preventivos: true, devengados: true } },
      },
    });
    if (!r) throw new NotFoundException('La remisión no existe');
    if (!this.esArchivo(usuario) && r.remitenteId !== usuario.id)
      throw new ForbiddenException('Esta remisión pertenece a otro remitente');
    return r;
  }

  private vista(r: Remision) {
    return {
      id: r.id,
      numeroRemision: r.numeroRemision,
      gestion: r.gestion,
      estado: r.estado,
      unidadRemitente: r.unidadRemitente,
      observacion: r.observacion,
      remitente: r.remitente?.nombreCompleto ?? null,
      remitenteId: r.remitenteId,
      receptor: r.receptor?.nombreCompleto ?? null,
      fechaEnvio: r.fechaEnvio,
      fechaRecepcion: r.fechaRecepcion,
      observacionRecepcion: r.observacionRecepcion,
      fechaCreacion: r.fechaCreacion,
      items: (r.items ?? []).map((i) => ({
        comprobanteId: i.comprobanteId,
        identificador: rotuloC31(i.comprobante, `#${i.comprobanteId}`),
        montoTotal: i.comprobante?.montoTotal,
        descripcion: i.comprobante?.descripcion,
        recibido: i.recibido ?? null,
        observacion: i.observacion ?? null,
      })),
    };
  }

  async findOne(id: number, usuario: Usuario) {
    return this.vista(await this.obtener(id, usuario));
  }

  async findAll(query: FilterRemisionesDto, usuario: Usuario) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 15;
    const qb = this.repo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.remitente', 'rem')
      .leftJoinAndSelect('r.receptor', 'rec')
      .leftJoinAndSelect('r.items', 'it')
      .leftJoinAndSelect('it.comprobante', 'c')
      .leftJoinAndSelect('c.preventivos', 'pv')
      .leftJoinAndSelect('c.devengados', 'dv');
    if (!this.esArchivo(usuario))
      qb.andWhere('r.remitente_id = :u', { u: usuario.id });
    else qb.andWhere(`r.estado <> 'BORRADOR'`);
    if (query.estado) qb.andWhere('r.estado = :e', { e: query.estado });
    if (query.search?.trim())
      qb.andWhere('r.numero_remision ILIKE :s', { s: `%${query.search.trim()}%` });
    qb.orderBy('r.id', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [rows, total] = await qb.getManyAndCount();
    return new PaginatedResponseDto(rows.map((r) => this.vista(r)), total, page, pageSize);
  }

  async update(id: number, dto: UpdateRemisionDto, usuario: Usuario) {
    const r = await this.obtener(id, usuario);
    if (r.remitenteId !== usuario.id)
      throw new ForbiddenException('Solo su remitente puede modificarla');
    if (r.estado !== 'BORRADOR')
      throw new ConflictException('Solo se edita una remisión en borrador');
    await this.dataSource.transaction(async (m) => {
      await m.update(Remision, id, {
        unidadRemitente: dto.unidadRemitente ?? r.unidadRemitente,
        observacion: dto.observacion ?? r.observacion,
      });
      if (dto.comprobanteIds) {
        await m.delete(RemisionItem, { remisionId: id });
        const ids = await this.cargarComprobantes(dto.comprobanteIds);
        await m.save(
          RemisionItem,
          ids.map((comprobanteId) =>
            m.create(RemisionItem, { remisionId: id, comprobanteId }),
          ),
        );
      }
    });
    return this.findOne(id, usuario);
  }

  async enviar(id: number, usuario: Usuario) {
    const r = await this.obtener(id, usuario);
    if (r.remitenteId !== usuario.id)
      throw new ForbiddenException('Solo su remitente puede enviarla');
    if (r.estado !== 'BORRADOR')
      throw new ConflictException('La remisión ya fue enviada');
    await this.repo.update(id, { estado: 'ENVIADA', fechaEnvio: new Date() });
    return this.findOne(id, usuario);
  }

  async remove(id: number, usuario: Usuario) {
    const r = await this.obtener(id, usuario);
    if (r.estado !== 'BORRADOR')
      throw new ConflictException('Solo se elimina una remisión en borrador');
    await this.repo.softDelete(id);
    return { ok: true };
  }

  /**
   * Archivo confirma la recepción: lo recibido pasa a "En revisión" (queda
   * listo para el acta de entrega); lo observado se devuelve al remitente.
   */
  async recibir(id: number, dto: RecibirRemisionDto, usuario: Usuario) {
    if (!this.esArchivo(usuario))
      throw new ForbiddenException('Solo Archivo confirma la recepción');
    const r = await this.obtener(id, usuario);
    if (r.estado !== 'ENVIADA')
      throw new ConflictException('La remisión no está pendiente de recepción');
    const revisados = new Map((dto.items ?? []).map((i) => [i.comprobanteId, i]));
    if (
      revisados.size !== (r.items ?? []).length ||
      (r.items ?? []).some((i) => !revisados.has(i.comprobanteId as number))
    )
      throw new BadRequestException(
        'Revise todos los comprobantes de la remisión (recibido u observado)',
      );
    let hayObservados = false;
    await this.dataSource.transaction(async (m) => {
      for (const item of r.items ?? []) {
        const rev = revisados.get(item.comprobanteId as number)!;
        if (!rev.recibido && !rev.observacion?.trim())
          throw new BadRequestException(
            'Indique el motivo de cada comprobante observado',
          );
        await m.update(RemisionItem, item.id as number, {
          recibido: rev.recibido,
          observacion: rev.observacion?.trim() || null,
        });
        if (rev.recibido) {
          await m.update(ComprobantesC31, item.comprobanteId as number, {
            estadoFisico: EstadoFisicoC31.EN_REVISION,
          });
          await registrarCambioEstado(m, {
            comprobanteId: item.comprobanteId as number,
            estadoAnterior: EstadoFisicoC31.EN_TRAMITE,
            estadoNuevo: EstadoFisicoC31.EN_REVISION,
            origen: 'REMISION',
            usuarioId: usuario.id,
            referencia: r.numeroRemision,
            detalle: 'Recibido en Archivo desde la remisión',
          });
        } else hayObservados = true;
      }
      await m.update(Remision, id, {
        estado: hayObservados ? 'OBSERVADA' : 'RECIBIDA',
        receptorId: usuario.id,
        fechaRecepcion: new Date(),
        observacionRecepcion: dto.observacion?.trim() || null,
      });
    });
    return this.findOne(id, usuario);
  }
}
