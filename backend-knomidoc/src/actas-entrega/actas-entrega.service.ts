import {
  BadRequestException,
  ConflictException,
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
import { registrarCambioEstado } from '../c31-historial/c31-historial.helper';

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
    const ids = [...new Set(comprobanteIds)];
    if (ids.length === 0) return;
    const encontrados = await manager.find(ComprobantesC31, {
      where: { id: In(ids) },
      relations: { preventivos: true, devengados: true },
    });
    const porId = new Map(encontrados.map((c) => [c.id, c]));
    for (const id of ids) {
      const c = porId.get(id);
      if (!c) throw new NotFoundException(`El comprobante ${id} no existe`);
      const nombre =
        c.preventivos?.[0]?.numeroPreventivo ??
        c.devengados?.[0]?.numeroDevengado ??
        `#${id}`;
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
    await manager.update(ComprobantesC31, { id: In(ids) }, { actaEntregaId: actaId });
  }

  async create(dto: CreateActasEntregaDto): Promise<ActasEntrega> {
    await this.validarNumeroActa(dto.numeroActa);
    const { comprobanteIds, ...cabecera } = dto;
    const id = await this.dataSource.transaction(async (manager) => {
      const acta = await manager.save(
        ActasEntrega,
        manager.create(ActasEntrega, {
          ...cabecera,
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
  ): Promise<PaginatedResponseDto<ActasEntrega>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const where: Record<string, unknown> = {};
    if (query.fechaDesde && query.fechaHasta) {
      where.fechaRecepcion = Between(query.fechaDesde, query.fechaHasta);
    }
    if (query.estado) where.estado = query.estado;

    const [data, total] = await this.repo.findAndCount({
      where: query.search
        ? [
            { ...where, numeroActa: Like(`%${query.search}%`) },
            { ...where, responsableEntrega: Like(`%${query.search}%`) },
            { ...where, responsableRecepcion: Like(`%${query.search}%`) },
          ]
        : where,
      relations: { aprobadoPor: true },
      order: { fechaRecepcion: query.order ?? 'DESC', id: 'DESC' },
      skip: paginationSkip(page, pageSize),
      take: pageSize,
    });

    return new PaginatedResponseDto(data, total, page, pageSize);
  }

  async findOne(id: number): Promise<ActasEntrega> {
    const acta = await this.repo.findOne({ where: { id }, relations: DETALLE });
    if (!acta) throw new NotFoundException('El acta de entrega no existe');
    return acta;
  }

  /** Edita el encabezado y, si viene `comprobanteIds`, reemplaza la selección (solo en borrador). */
  async update(id: number, dto: UpdateActasEntregaDto): Promise<ActasEntrega> {
    const { comprobanteIds, ...cabecera } = dto;
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

  async agregarComprobantes(id: number, comprobanteIds: number[]) {
    await this.dataSource.transaction(async (manager) => {
      await this.cargarBorrador(manager, id);
      await this.vincular(manager, id, comprobanteIds);
      await this.sincronizarCantidad(manager, id);
    });
    return this.findOne(id);
  }

  async quitarComprobante(id: number, comprobanteId: number) {
    await this.dataSource.transaction(async (manager) => {
      await this.cargarBorrador(manager, id);
      await manager.update(
        ComprobantesC31,
        { id: comprobanteId, actaEntregaId: id },
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
        const c = items.find((x) => x.id === o.comprobanteId) as ComprobantesC31;
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
  async anular(id: number): Promise<ActasEntrega> {
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
