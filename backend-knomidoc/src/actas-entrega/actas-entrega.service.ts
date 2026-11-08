import { rotuloC31 } from '../common/utils/identificador-c31.util';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  EntityManager,
  In,
  Like,
  Repository,
} from 'typeorm';
import { CreateActasEntregaDto } from './dto/create-actas-entrega.dto';
import { UpdateActasEntregaDto } from './dto/update-actas-entrega.dto';
import { AprobarActasEntregaDto } from './dto/aprobar-actas-entrega.dto';
import { ActasEntrega, EstadoActa } from './entities/actas-entrega.entity';
import { FilterActasEntregaDto } from './dto/filter-actas-entrega.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { paginationSkip } from '../common/utils/pagination.util';
import {
  ComprobantesC31,
  ESTADO_FISICO_LABELS,
  EstadoFisicoC31,
  UBICACION_ARCHIVO_DEFAULT,
} from '../comprobantes_c31/entities/comprobantes_c31.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { validarRangoFecha } from '../common/utils/fechas.util';
import { registrarCambioEstado } from '../c31-historial/c31-historial.helper';
import { adjuntarRotuloGrupo } from '../common/utils/rotulo-grupo.util';

const DETALLE = {
  comprobantesC31: { preventivos: true, devengados: true, beneficiarios: true },
  aprobadoPor: true,
};

@Injectable()
export class ActasEntregaService {
  constructor(
    @InjectRepository(ActasEntrega)
    private readonly repo: Repository<ActasEntrega>,
    private readonly dataSource: DataSource,
  ) {}

  private async validarNumeroActa(numeroActa?: string, excluirId?: number) {
    if (!numeroActa) return;
    const existente = await this.repo.findOneBy({ numeroActa });
    if (existente && existente.id !== excluirId) {
      throw new ConflictException(
        `Ya existe un acta con el número ${numeroActa}`,
      );
    }
  }

  /** Mantiene cantidad_comprobantes = comprobantes vinculados al acta. */
  private async sincronizarCantidad(manager: EntityManager, actaId: number) {
    const cantidad = await manager.countBy(ComprobantesC31, {
      actaEntregaId: actaId,
    });
    await manager.update(ActasEntrega, actaId, {
      cantidadComprobantes: cantidad,
    });
  }

  private async cargarBorrador(manager: EntityManager, id: number) {
    const acta = await manager.findOne(ActasEntrega, { where: { id } });
    if (!acta) throw new NotFoundException('El acta de entrega no existe');
    if (acta.estado !== EstadoActa.BORRADOR) {
      throw new ConflictException(
        `El acta está ${acta.estado === EstadoActa.RECIBIDA ? 'recibida' : 'anulada'} y ya no se puede modificar`,
      );
    }
    return acta;
  }

  /** Solo se entregan comprobantes firmados (En revisión) y libres de otra acta. */
  private async vincular(
    manager: EntityManager,
    actaId: number,
    comprobanteIds: number[],
  ) {
    let ids = [...new Set(comprobanteIds)];
    if (ids.length === 0) return;
    // Los comprobantes unidos (PREV 3 + PREV 7, PREV + DEV) se entregan juntos
    const grupos = await manager.find(ComprobantesC31, {
      where: { id: In(ids) },
      select: { id: true, grupoUnionId: true },
    });
    const gruposIds = [
      ...new Set(grupos.map((g) => g.grupoUnionId).filter(Boolean)),
    ] as string[];
    if (gruposIds.length > 0) {
      const hermanos = await manager.find(ComprobantesC31, {
        where: { grupoUnionId: In(gruposIds) },
        select: { id: true },
      });
      ids = [...new Set([...ids, ...hermanos.map((h) => h.id as number)])];
    }
    const encontrados = await manager.find(ComprobantesC31, {
      where: { id: In(ids) },
      relations: { preventivos: true, devengados: true },
    });
    const porId = new Map(encontrados.map((c) => [c.id, c]));
    for (const id of ids) {
      const c = porId.get(id);
      if (!c) throw new NotFoundException(`El comprobante ${id} no existe`);
      const nombre = rotuloC31(c, `#${id}`);
      if (c.estadoFisico !== EstadoFisicoC31.EN_REVISION) {
        throw new ConflictException(
          `El comprobante ${nombre} está "${ESTADO_FISICO_LABELS[c.estadoFisico as EstadoFisicoC31]}": solo se entregan comprobantes "En revisión / firmado"`,
        );
      }
      if (c.actaEntregaId && c.actaEntregaId !== actaId) {
        throw new ConflictException(
          `El comprobante ${nombre} ya está en otra acta de entrega`,
        );
      }
    }
    await manager.update(
      ComprobantesC31,
      { id: In(ids) },
      { actaEntregaId: actaId },
    );
  }

  private esRemitente(u?: Usuario) {
    return (u?.rolActivo ?? u?.rol) === 'REMITENTE_C31';
  }

  /** El remitente solo toca sus propias actas. */
  private async verificarPropietario(id: number, usuario?: Usuario) {
    if (!this.esRemitente(usuario)) return;
    const acta = await this.repo.findOne({
      where: { id },
      select: { id: true, creadoPorId: true },
    });
    if (!acta) throw new NotFoundException('El acta de entrega no existe');
    if (acta.creadoPorId !== usuario?.id)
      throw new ForbiddenException('Esta acta pertenece a otro remitente');
  }

  /** AE-<año>-<correlativo> */
  private async siguienteNumeroActa(manager: EntityManager) {
    const anio = new Date().getFullYear();
    const prefijo = `AE-${anio}-`;
    const [{ max }] = await manager.query<{ max: number | null }[]>(
      `SELECT MAX(NULLIF(regexp_replace(numero_acta, '^AE-${anio}-', ''), '')::int) AS max
       FROM actas_entrega WHERE numero_acta ~ '^AE-${anio}-[0-9]+$'`,
    );
    return `${prefijo}${String((max ?? 0) + 1).padStart(3, '0')}`;
  }

  /** Comprobantes que un remitente puede incluir: firmados (En revisión) y sin acta. */
  async candidatos(search?: string) {
    const qb = this.dataSource
      .getRepository(ComprobantesC31)
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.preventivos', 'pv')
      .leftJoinAndSelect('c.devengados', 'dv')
      .leftJoinAndSelect('c.beneficiarios', 'bn')
      .where('c.estado_fisico = :e', { e: EstadoFisicoC31.EN_REVISION })
      .andWhere('c.acta_entrega_id IS NULL');
    const t = search?.trim();
    if (t) {
      qb.andWhere(
        `(pv.numero_preventivo ILIKE :t OR dv.numero_devengado ILIKE :t OR c.descripcion ILIKE :t OR bn.nombre_beneficiario ILIKE :t)`,
        { t: `%${t.replace(/[%_]/g, '\\$&')}%` },
      );
    }
    return qb.orderBy('c.id', 'DESC').take(30).getMany();
  }

  async create(
    dto: CreateActasEntregaDto,
    usuario?: Usuario,
  ): Promise<ActasEntrega> {
    validarRangoFecha('La fecha de entrega', dto.fechaRecepcion);
    await this.validarNumeroActa(dto.numeroActa);
    const { comprobanteIds, ...cabecera } = dto;
    const id = await this.dataSource.transaction(async (manager) => {
      const acta = await manager.save(
        ActasEntrega,
        manager.create(ActasEntrega, {
          ...cabecera,
          numeroActa:
            dto.numeroActa || (await this.siguienteNumeroActa(manager)),
          responsableRecepcion: dto.responsableRecepcion || 'Archivo Central',
          creadoPorId: usuario?.id ?? null,
          unidadEmisora: dto.unidadEmisora || 'Tesorería',
          estado: EstadoActa.BORRADOR,
          cantidadComprobantes: 0,
        }),
      );
      await this.vincular(manager, acta.id as number, comprobanteIds ?? []);
      await this.sincronizarCantidad(manager, acta.id as number);
      return acta.id as number;
    });
    return this.findOne(id);
  }

  async findAll(
    query: FilterActasEntregaDto,
    usuario?: Usuario,
  ): Promise<PaginatedResponseDto<ActasEntrega>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const where: Record<string, unknown> = {};
    if (query.fechaDesde && query.fechaHasta) {
      where.fechaRecepcion = Between(query.fechaDesde, query.fechaHasta);
    }
    if (query.estado) where.estado = query.estado;
    if (this.esRemitente(usuario)) where.creadoPorId = usuario?.id;

    const [data, total] = await this.repo.findAndCount({
      where: query.search
        ? [
            { ...where, numeroActa: Like(`%${query.search}%`) },
            { ...where, responsableEntrega: Like(`%${query.search}%`) },
            { ...where, responsableRecepcion: Like(`%${query.search}%`) },
          ]
        : where,
      relations: { aprobadoPor: true, creadoPor: true },
      order: { fechaRecepcion: query.order ?? 'DESC', id: 'DESC' },
      skip: paginationSkip(page, pageSize),
      take: pageSize,
    });

    return new PaginatedResponseDto(data, total, page, pageSize);
  }

  async findOne(id: number, usuario?: Usuario): Promise<ActasEntrega> {
    await this.verificarPropietario(id, usuario);
    const acta = await this.repo.findOne({ where: { id }, relations: DETALLE });
    if (!acta) throw new NotFoundException('El acta de entrega no existe');
    await adjuntarRotuloGrupo(this.dataSource.manager, acta);
    return acta;
  }

  /** Edita el encabezado y, si viene `comprobanteIds`, reemplaza la selección (solo en borrador). */
  async update(
    id: number,
    dto: UpdateActasEntregaDto,
    usuario?: Usuario,
  ): Promise<ActasEntrega> {
    await this.verificarPropietario(id, usuario);
    const { comprobanteIds, ...cabecera } = dto;
    validarRangoFecha('La fecha de entrega', dto.fechaRecepcion);
    await this.dataSource.transaction(async (manager) => {
      const acta = await this.cargarBorrador(manager, id);
      if (cabecera.numeroActa && cabecera.numeroActa !== acta.numeroActa) {
        await this.validarNumeroActa(cabecera.numeroActa, id);
      }
      const cambios = Object.fromEntries(
        Object.entries(cabecera).filter(([, v]) => v !== undefined),
      );
      if (Object.keys(cambios).length > 0) {
        await manager.update(ActasEntrega, id, cambios);
      }
      if (comprobanteIds !== undefined) {
        const nuevos = new Set(comprobanteIds);
        const actuales = await manager.findBy(ComprobantesC31, {
          actaEntregaId: id,
        });
        const quitar = actuales.filter((c) => !nuevos.has(c.id as number));
        if (quitar.length > 0) {
          await manager.update(
            ComprobantesC31,
            { id: In(quitar.map((c) => c.id as number)) },
            { actaEntregaId: null },
          );
        }
        await this.vincular(manager, id, comprobanteIds);
        await this.sincronizarCantidad(manager, id);
      }
    });
    return this.findOne(id);
  }

  async agregarComprobantes(
    id: number,
    comprobanteIds: number[],
    usuario?: Usuario,
  ) {
    await this.verificarPropietario(id, usuario);
    await this.dataSource.transaction(async (manager) => {
      await this.cargarBorrador(manager, id);
      await this.vincular(manager, id, comprobanteIds);
      await this.sincronizarCantidad(manager, id);
    });
    return this.findOne(id);
  }

  async quitarComprobante(
    id: number,
    comprobanteId: number,
    usuario?: Usuario,
  ) {
    await this.verificarPropietario(id, usuario);
    await this.dataSource.transaction(async (manager) => {
      await this.cargarBorrador(manager, id);
      const c = await manager.findOne(ComprobantesC31, {
        where: { id: comprobanteId },
      });
      // Si está unido a otros, salen juntos del acta
      const ids = c?.grupoUnionId
        ? (
            await manager.find(ComprobantesC31, {
              where: { grupoUnionId: c.grupoUnionId },
              select: { id: true },
            })
          ).map((m) => m.id as number)
        : [comprobanteId];
      await manager.update(
        ComprobantesC31,
        { id: In(ids), actaEntregaId: id },
        { actaEntregaId: null },
      );
      await this.sincronizarCantidad(manager, id);
    });
    return this.findOne(id);
  }

  /**
   * El archivista aprueba la recepción: los comprobantes verificados pasan a
   * "En archivo" (en ARCHIVOS GAMSL) y los que tienen fallas vuelven como
   * "Observado", desvinculados del acta y con su motivo.
   */
  async aprobar(
    id: number,
    dto: AprobarActasEntregaDto,
    usuario: Usuario,
  ): Promise<ActasEntrega> {
    await this.dataSource.transaction(async (manager) => {
      const acta = await this.cargarBorrador(manager, id);
      const items = await manager.findBy(ComprobantesC31, {
        actaEntregaId: id,
      });
      if (items.length === 0) {
        throw new BadRequestException('El acta no tiene comprobantes');
      }

      const recibidos = [...new Set(dto.recibidos ?? [])];
      const observados = dto.observados ?? [];
      const idsActa = new Set(items.map((c) => c.id as number));
      const idsRevisados = [
        ...recibidos,
        ...observados.map((o) => o.comprobanteId as number),
      ];
      if (
        new Set(idsRevisados).size !== idsRevisados.length ||
        idsRevisados.some((x) => !idsActa.has(x))
      ) {
        throw new BadRequestException(
          'La revisión incluye comprobantes repetidos o que no pertenecen al acta',
        );
      }
      if (idsRevisados.length !== idsActa.size) {
        throw new BadRequestException(
          'Revise todos los comprobantes del acta: márquelos como recibidos o indique su observación',
        );
      }

      const ref = `Acta ${acta.numeroActa}`;
      for (const c of items.filter((x) => recibidos.includes(x.id as number))) {
        if (c.estadoFisico !== EstadoFisicoC31.EN_REVISION) {
          throw new ConflictException(
            `El comprobante ${c.id} ya no está "En revisión / firmado"; quítelo del acta`,
          );
        }
        await manager.update(ComprobantesC31, c.id as number, {
          estadoFisico: EstadoFisicoC31.EN_ARCHIVO,
          ubicacionFisica: c.ubicacionFisica || UBICACION_ARCHIVO_DEFAULT,
        });
        await registrarCambioEstado(manager, {
          comprobanteId: c.id as number,
          estadoAnterior: EstadoFisicoC31.EN_REVISION,
          estadoNuevo: EstadoFisicoC31.EN_ARCHIVO,
          origen: 'ACTA',
          usuarioId: usuario.id,
          referencia: ref,
          detalle: 'Recibido y verificado en Archivo',
        });
      }
      for (const o of observados) {
        const c = items.find(
          (x) => x.id === o.comprobanteId,
        ) as ComprobantesC31;
        await manager.update(ComprobantesC31, c.id as number, {
          estadoFisico: EstadoFisicoC31.OBSERVADO,
          observaciones: o.motivo,
          actaEntregaId: null,
        });
        await registrarCambioEstado(manager, {
          comprobanteId: c.id as number,
          estadoAnterior: c.estadoFisico,
          estadoNuevo: EstadoFisicoC31.OBSERVADO,
          origen: 'ACTA',
          usuarioId: usuario.id,
          referencia: ref,
          detalle: `Devuelto en la recepción: ${o.motivo}`,
        });
      }

      await manager.update(ActasEntrega, id, {
        estado: EstadoActa.RECIBIDA,
        fechaAprobacion: new Date(),
        aprobadoPorId: usuario.id,
        ...(dto.fechaRecepcion ? { fechaRecepcion: dto.fechaRecepcion } : {}),
        ...(dto.observaciones ? { observaciones: dto.observaciones } : {}),
      });
      await this.sincronizarCantidad(manager, id);
    });
    return this.findOne(id);
  }

  /** Deja sin efecto un acta no recibida; sus comprobantes quedan libres (En revisión). */
  async anular(id: number, usuario?: Usuario): Promise<ActasEntrega> {
    await this.verificarPropietario(id, usuario);
    await this.dataSource.transaction(async (manager) => {
      await this.cargarBorrador(manager, id);
      await manager.update(
        ComprobantesC31,
        { actaEntregaId: id },
        { actaEntregaId: null },
      );
      await manager.update(ActasEntrega, id, { estado: EstadoActa.ANULADA });
      await this.sincronizarCantidad(manager, id);
    });
    return this.findOne(id);
  }

  async remove(id: number): Promise<ActasEntrega> {
    const acta = await this.findOne(id);
    if ((acta.comprobantesC31?.length ?? 0) > 0) {
      throw new ConflictException(
        'No se puede eliminar un acta que tiene comprobantes C31 vinculados',
      );
    }
    return this.repo.remove(acta);
  }
}
