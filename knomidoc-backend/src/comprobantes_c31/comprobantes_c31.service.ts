import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, In, Like, Repository } from 'typeorm';
import {
  ComprobantesC31,
  EstadoAprobacionC31,
  EstadoFisicoC31,
} from './entities/comprobantes_c31.entity';
import {
  CarpetaUbicacionItemDto,
  CreateComprobantesC31Dto,
} from './dto/create-comprobantes_c31.dto';
import { UpdateComprobantesC31Dto } from './dto/update-comprobantes_c31.dto';
import { FilterComprobantesC31Dto } from './dto/filter-comprobantes_c31.dto';
import { C31Preventivo } from '../c31-preventivos/entities/c31-preventivo.entity';
import { C31Devengado } from '../c31-devengados/entities/c31-devengado.entity';
import { C31Beneficiario } from '../c31-beneficiarios/entities/c31-beneficiario.entity';
import { C31Cheque } from '../c31-cheques/entities/c31-cheque.entity';
import { C31CarpetasUbicacion } from '../c31-carpetas-ubicacion/entities/c31-carpetas-ubicacion.entity';
import { Carpeta } from '../carpetas/entities/carpeta.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { paginationSkip } from '../common/utils/pagination.util';
import { Usuario } from '../usuarios/entities/usuario.entity';

const RELATIONS = {
  notaEntrega: true,
  creadoPor: true,
  preventivos: true,
  devengados: true,
  beneficiarios: true,
  cheques: true,
  carpetasUbicacion: true,
  'carpetasUbicacion.carpeta': true,
};

@Injectable()
export class ComprobantesC31Service {
  constructor(
    @InjectRepository(ComprobantesC31)
    private readonly repo: Repository<ComprobantesC31>,
    @InjectRepository(Carpeta)
    private readonly carpetasRepo: Repository<Carpeta>,
    private readonly dataSource: DataSource,
  ) {}

  private validarCarpetas(carpetas: CarpetaUbicacionItemDto[]) {
    if (!carpetas || carpetas.length === 0) {
      throw new BadRequestException(
        'Debe indicar al menos 1 carpeta de ubicación',
      );
    }
    if (carpetas.length > 5) {
      throw new BadRequestException(
        'Un comprobante C31 no puede ocupar más de 5 carpetas',
      );
    }
    const partes = carpetas.map((c) => c.numeroParte);
    if (new Set(partes).size !== partes.length) {
      throw new BadRequestException(
        'Los números de parte de las carpetas no pueden repetirse',
      );
    }
  }

  async create(
    dto: CreateComprobantesC31Dto,
    usuario: Usuario,
  ): Promise<ComprobantesC31> {
    this.validarCarpetas(dto.carpetas);

    // Verifica que las carpetas indicadas existan
    const carpetaIds = dto.carpetas.map((c) => c.carpetaId as number);
    const carpetasExistentes = await this.carpetasRepo.findBy({
      id: In(carpetaIds),
    });
    const idsValidos = new Set(carpetasExistentes.map((c) => c.id));
    for (const id of carpetaIds) {
      if (!idsValidos.has(id)) {
        throw new NotFoundException(`La carpeta con id ${id} no existe`);
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const comprobante = manager.create(ComprobantesC31, {
        notaEntregaId: dto.notaEntregaId,
        montoTotal: dto.montoTotal,
        fechaElaboracion: dto.fechaElaboracion,
        descripcion: dto.descripcion,
        numeroFolio: dto.numeroFolio,
        estaFoliado: dto.estaFoliado ?? false,
        cantidadCarpetas: dto.carpetas.length,
        estadoAprobacion: EstadoAprobacionC31.PENDIENTE,
        estadoFisico: EstadoFisicoC31.EN_ARCHIVO,
        creadoPorId: usuario.id,
        preventivos: dto.preventivos.map((numeroPreventivo) =>
          manager.create(C31Preventivo, { numeroPreventivo }),
        ),
        devengados: dto.devengados.map((numeroDevengado) =>
          manager.create(C31Devengado, { numeroDevengado }),
        ),
        beneficiarios: dto.beneficiarios.map((nombreBeneficiario) =>
          manager.create(C31Beneficiario, { nombreBeneficiario }),
        ),
        cheques: (dto.cheques ?? []).map((numeroCheque) =>
          manager.create(C31Cheque, { numeroCheque }),
        ),
        carpetasUbicacion: dto.carpetas.map((c) =>
          manager.create(C31CarpetasUbicacion, {
            carpeta: { id: c.carpetaId } as Carpeta,
            numeroParte: c.numeroParte,
          }),
        ),
      });

      const guardado = await manager.save(ComprobantesC31, comprobante);
      const completo = await manager.findOne(ComprobantesC31, {
        where: { id: guardado.id },
        relations: RELATIONS,
      });
      if (!completo)
        throw new NotFoundException(
          'No se pudo recuperar el comprobante creado',
        );
      return completo;
    });
  }

  async findAll(
    query: FilterComprobantesC31Dto,
  ): Promise<PaginatedResponseDto<ComprobantesC31>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const baseWhere: Record<string, any> = {};
    if (query.estadoAprobacion)
      baseWhere.estadoAprobacion = query.estadoAprobacion;
    if (query.estadoFisico) baseWhere.estadoFisico = query.estadoFisico;
    if (query.fechaDesde && query.fechaHasta) {
      baseWhere.fechaElaboracion = Between(query.fechaDesde, query.fechaHasta);
    }

    const where = query.search
      ? [{ ...baseWhere, descripcion: Like(`%${query.search}%`) }]
      : baseWhere;

    const [data, total] = await this.repo.findAndCount({
      where,
      relations: RELATIONS,
      order: { fechaCreacion: query.order ?? 'DESC' },
      skip: paginationSkip(page, pageSize),
      take: pageSize,
    });

    return new PaginatedResponseDto(data, total, page, pageSize);
  }

  async findOne(id: number): Promise<ComprobantesC31> {
    const comprobante = await this.repo.findOne({
      where: { id },
      relations: RELATIONS,
    });
    if (!comprobante)
      throw new NotFoundException('El comprobante C31 no existe');
    return comprobante;
  }

  async update(
    id: number,
    dto: UpdateComprobantesC31Dto,
  ): Promise<ComprobantesC31> {
    const comprobante = await this.findOne(id);

    if (comprobante.estadoAprobacion === EstadoAprobacionC31.APROBADO) {
      throw new ConflictException(
        'No se puede modificar un comprobante que ya fue aprobado',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      // Campos simples
      const camposSimples: Partial<ComprobantesC31> = {};
      if (dto.notaEntregaId !== undefined)
        camposSimples.notaEntregaId = dto.notaEntregaId;
      if (dto.montoTotal !== undefined)
        camposSimples.montoTotal = dto.montoTotal;
      if (dto.fechaElaboracion !== undefined)
        camposSimples.fechaElaboracion =
          dto.fechaElaboracion as unknown as Date;
      if (dto.descripcion !== undefined)
        camposSimples.descripcion = dto.descripcion;
      if (dto.numeroFolio !== undefined)
        camposSimples.numeroFolio = dto.numeroFolio;
      if (dto.estaFoliado !== undefined)
        camposSimples.estaFoliado = dto.estaFoliado;

      await manager.update(ComprobantesC31, id, camposSimples);

      // Reemplazo de colecciones si vienen en el DTO
      if (dto.preventivos) {
        await manager.delete(C31Preventivo, { comprobante: { id } });
        await manager.save(
          C31Preventivo,
          dto.preventivos.map((numeroPreventivo) =>
            manager.create(C31Preventivo, {
              numeroPreventivo,
              comprobante: { id } as ComprobantesC31,
            }),
          ),
        );
      }
      if (dto.devengados) {
        await manager.delete(C31Devengado, { comprobante: { id } });
        await manager.save(
          C31Devengado,
          dto.devengados.map((numeroDevengado) =>
            manager.create(C31Devengado, {
              numeroDevengado,
              comprobante: { id } as ComprobantesC31,
            }),
          ),
        );
      }
      if (dto.beneficiarios) {
        await manager.delete(C31Beneficiario, { comprobante: { id } });
        await manager.save(
          C31Beneficiario,
          dto.beneficiarios.map((nombreBeneficiario) =>
            manager.create(C31Beneficiario, {
              nombreBeneficiario,
              comprobante: { id } as ComprobantesC31,
            }),
          ),
        );
      }
      if (dto.cheques) {
        await manager.delete(C31Cheque, { comprobante: { id } });
        await manager.save(
          C31Cheque,
          dto.cheques.map((numeroCheque) =>
            manager.create(C31Cheque, {
              numeroCheque,
              comprobante: { id } as ComprobantesC31,
            }),
          ),
        );
      }
      if (dto.carpetas) {
        this.validarCarpetas(dto.carpetas);
        await manager.delete(C31CarpetasUbicacion, { comprobante: { id } });
        await manager.save(
          C31CarpetasUbicacion,
          dto.carpetas.map((c) =>
            manager.create(C31CarpetasUbicacion, {
              carpeta: { id: c.carpetaId } as Carpeta,
              numeroParte: c.numeroParte,
              comprobante: { id } as ComprobantesC31,
            }),
          ),
        );
        await manager.update(ComprobantesC31, id, {
          cantidadCarpetas: dto.carpetas.length,
        });
      }

      const actualizado = await manager.findOne(ComprobantesC31, {
        where: { id },
        relations: RELATIONS,
      });
      if (!actualizado)
        throw new NotFoundException('El comprobante C31 no existe');
      return actualizado;
    });
  }

  /** RF-02.3: aprobación exclusiva de ADMIN */
  async aprobar(id: number): Promise<ComprobantesC31> {
    const comprobante = await this.findOne(id);
    if (comprobante.estadoAprobacion !== EstadoAprobacionC31.PENDIENTE) {
      throw new ConflictException(
        'Solo se pueden aprobar comprobantes en estado PENDIENTE',
      );
    }
    comprobante.estadoAprobacion = EstadoAprobacionC31.APROBADO;
    comprobante.motivoRechazo = undefined;
    return this.repo.save(comprobante);
  }

  async rechazar(id: number, motivo: string): Promise<ComprobantesC31> {
    const comprobante = await this.findOne(id);
    if (comprobante.estadoAprobacion !== EstadoAprobacionC31.PENDIENTE) {
      throw new ConflictException(
        'Solo se pueden rechazar comprobantes en estado PENDIENTE',
      );
    }
    comprobante.estadoAprobacion = EstadoAprobacionC31.RECHAZADO;
    comprobante.motivoRechazo = motivo;
    return this.repo.save(comprobante);
  }

  async remove(id: number): Promise<ComprobantesC31> {
    const comprobante = await this.findOne(id);
    if (comprobante.estadoFisico === EstadoFisicoC31.PRESTADO) {
      throw new ConflictException(
        'No se puede eliminar un comprobante que se encuentra prestado',
      );
    }
    return this.repo.softRemove(comprobante);
  }
}
