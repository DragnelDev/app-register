import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreatePrestamosNotaDto } from './dto/create-prestamos-nota.dto';
import { UpdatePrestamosNotaDto } from './dto/update-prestamos-nota.dto';
import { FilterPrestamosNotaDto } from './dto/filter-prestamos-nota.dto';
import { PrestamosNota } from './entities/prestamos-nota.entity';
import { PrestamosNotaDetalle } from '../prestamos-nota-detalle/entities/prestamos-nota-detalle.entity';
import {
  ComprobantesC31,
  EstadoFisicoC31,
} from '../comprobantes_c31/entities/comprobantes_c31.entity';
import { Carpeta } from '../carpetas/entities/carpeta.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { paginationSkip } from '../common/utils/pagination.util';
import { Usuario } from '../usuarios/entities/usuario.entity';

const RELATIONS = {
  detalles: true,
  'detalles.comprobante': true,
  'detalles.carpeta': true,
};

@Injectable()
export class PrestamosNotaService {
  constructor(
    @InjectRepository(PrestamosNota)
    private readonly repo: Repository<PrestamosNota>,
    @InjectRepository(PrestamosNotaDetalle)
    private readonly detalleRepo: Repository<PrestamosNotaDetalle>,
    @InjectRepository(ComprobantesC31)
    private readonly comprobantesRepo: Repository<ComprobantesC31>,
    @InjectRepository(Carpeta)
    private readonly carpetasRepo: Repository<Carpeta>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    dto: CreatePrestamosNotaDto,
    usuario: Usuario,
  ): Promise<PrestamosNota> {
    for (const item of dto.items) {
      const tieneComprobante = !!item.comprobanteId;
      const tieneCarpeta = !!item.carpetaId;
      if (tieneComprobante === tieneCarpeta) {
        throw new BadRequestException(
          'Cada ítem debe indicar exactamente uno: comprobanteId o carpetaId',
        );
      }
    }

    return this.dataSource.transaction(async (manager) => {
      // Validar disponibilidad de cada ítem
      for (const item of dto.items) {
        if (item.comprobanteId) {
          const comprobante = await manager.findOne(ComprobantesC31, {
            where: { id: item.comprobanteId },
          });
          if (!comprobante) {
            throw new NotFoundException(
              `El comprobante ${item.comprobanteId} no existe`,
            );
          }
          if (comprobante.estadoFisico === EstadoFisicoC31.PRESTADO) {
            throw new ConflictException(
              `El comprobante ${item.comprobanteId} ya se encuentra prestado`,
            );
          }
        } else if (item.carpetaId) {
          const carpeta = await manager.findOne(Carpeta, {
            where: { id: item.carpetaId },
          });
          if (!carpeta) {
            throw new NotFoundException(
              `La carpeta ${item.carpetaId} no existe`,
            );
          }
          if (carpeta.estadoFisico === 'PRESTADO') {
            throw new ConflictException(
              `La carpeta ${item.carpetaId} ya se encuentra prestada`,
            );
          }
        }
      }

      const prestamoNota = manager.create(PrestamosNota, {
        numeroNotaSolicitud: dto.numeroNotaSolicitud,
        unidadSolicitante: dto.unidadSolicitante,
        aQuienSePresta: dto.aQuienSePresta,
        estadoPrestamo: 'PRESTADO',
        detalles: dto.items.map((item) =>
          manager.create(PrestamosNotaDetalle, {
            comprobante: item.comprobanteId
              ? ({ id: item.comprobanteId } as ComprobantesC31)
              : undefined,
            carpeta: item.carpetaId
              ? ({ id: item.carpetaId } as Carpeta)
              : undefined,
            estadoItem: 'PRESTADO',
          }),
        ),
      });

      const guardado = await manager.save(PrestamosNota, prestamoNota);

      // Marca como PRESTADO cada comprobante/carpeta referenciado
      for (const item of dto.items) {
        if (item.comprobanteId) {
          await manager.update(ComprobantesC31, item.comprobanteId, {
            estadoFisico: EstadoFisicoC31.PRESTADO,
          });
        } else if (item.carpetaId) {
          await manager.update(Carpeta, item.carpetaId, {
            estadoFisico: 'PRESTADO',
          });
        }
      }

      const completo = await manager.findOne(PrestamosNota, {
        where: { id: guardado.id },
        relations: RELATIONS,
      });
      if (!completo)
        throw new NotFoundException('No se pudo recuperar el préstamo creado');
      return completo;
    });
  }

  async findAll(
    query: FilterPrestamosNotaDto,
  ): Promise<PaginatedResponseDto<PrestamosNota>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const where: Record<string, any> = {};
    if (query.estadoPrestamo) where.estadoPrestamo = query.estadoPrestamo;

    const [data, total] = await this.repo.findAndCount({
      where,
      relations: RELATIONS,
      order: { id: query.order ?? 'DESC' },
      skip: paginationSkip(page, pageSize),
      take: pageSize,
    });

    return new PaginatedResponseDto(data, total, page, pageSize);
  }

  async findOne(id: number): Promise<PrestamosNota> {
    const prestamo = await this.repo.findOne({
      where: { id },
      relations: RELATIONS,
    });
    if (!prestamo)
      throw new NotFoundException('El préstamo por nota no existe');
    return prestamo;
  }

  async update(
    id: number,
    dto: UpdatePrestamosNotaDto,
  ): Promise<PrestamosNota> {
    const prestamo = await this.findOne(id);
    if (prestamo.estadoPrestamo === 'DEVUELTO') {
      throw new ConflictException(
        'No se puede modificar un préstamo ya devuelto',
      );
    }
    Object.assign(prestamo, {
      numeroNotaSolicitud:
        dto.numeroNotaSolicitud ?? prestamo.numeroNotaSolicitud,
      unidadSolicitante: dto.unidadSolicitante ?? prestamo.unidadSolicitante,
      aQuienSePresta: dto.aQuienSePresta ?? prestamo.aQuienSePresta,
    });
    return this.repo.save(prestamo);
  }

  /** RF-03.3: devuelve un ítem específico del préstamo en lote */
  async devolverItem(
    prestamoNotaId: number,
    detalleId: number,
  ): Promise<PrestamosNota> {
    return this.dataSource.transaction(async (manager) => {
      const detalle = await manager.findOne(PrestamosNotaDetalle, {
        where: { id: detalleId, prestamoNota: { id: prestamoNotaId } },
        relations: { comprobante: true, carpeta: true, prestamoNota: true },
      });
      if (!detalle)
        throw new NotFoundException('El ítem del préstamo no existe');
      if (detalle.estadoItem === 'DEVUELTO') {
        throw new ConflictException('Este ítem ya fue devuelto');
      }

      detalle.estadoItem = 'DEVUELTO';
      await manager.save(PrestamosNotaDetalle, detalle);

      if (detalle.comprobante?.id) {
        await manager.update(ComprobantesC31, detalle.comprobante.id, {
          estadoFisico: EstadoFisicoC31.EN_ARCHIVO,
        });
      } else if (detalle.carpeta?.id) {
        await manager.update(Carpeta, detalle.carpeta.id, {
          estadoFisico: 'EN_ARCHIVO',
        });
      }

      // Si todos los ítems ya fueron devueltos, cierra el préstamo por nota completo
      const pendientes = await manager.count(PrestamosNotaDetalle, {
        where: { prestamoNota: { id: prestamoNotaId }, estadoItem: 'PRESTADO' },
      });
      if (pendientes === 0) {
        await manager.update(PrestamosNota, prestamoNotaId, {
          estadoPrestamo: 'DEVUELTO',
        });
      }

      const completo = await manager.findOne(PrestamosNota, {
        where: { id: prestamoNotaId },
        relations: RELATIONS,
      });
      if (!completo)
        throw new NotFoundException('El préstamo por nota no existe');
      return completo;
    });
  }

  async remove(id: number): Promise<PrestamosNota> {
    const prestamo = await this.findOne(id);
    if (prestamo.estadoPrestamo === 'PRESTADO') {
      throw new ConflictException(
        'No se puede eliminar un préstamo con ítems activos',
      );
    }
    return this.repo.remove(prestamo);
  }
}
