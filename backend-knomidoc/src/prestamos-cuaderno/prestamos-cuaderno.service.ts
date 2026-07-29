import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreatePrestamosCuadernoDto } from './dto/create-prestamos-cuaderno.dto';
import { UpdatePrestamosCuadernoDto } from './dto/update-prestamos-cuaderno.dto';
import { FilterPrestamosCuadernoDto } from './dto/filter-prestamos-cuaderno.dto';
import { PrestamosCuaderno } from './entities/prestamos-cuaderno.entity';
import {
  ComprobantesC31,
  EstadoFisicoC31,
} from '../comprobantes_c31/entities/comprobantes_c31.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { paginationSkip } from '../common/utils/pagination.util';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Injectable()
export class PrestamosCuadernoService {
  constructor(
    @InjectRepository(PrestamosCuaderno)
    private readonly repo: Repository<PrestamosCuaderno>,
    @InjectRepository(ComprobantesC31)
    private readonly comprobantesRepo: Repository<ComprobantesC31>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    dto: CreatePrestamosCuadernoDto,
    usuario: Usuario,
  ): Promise<PrestamosCuaderno> {
    return this.dataSource.transaction(async (manager) => {
      const comprobante = await manager.findOne(ComprobantesC31, {
        where: { id: dto.comprobanteId },
      });
      if (!comprobante) {
        throw new NotFoundException('El comprobante C31 no existe');
      }
      if (comprobante.estadoFisico === EstadoFisicoC31.PRESTADO) {
        throw new ConflictException('El comprobante ya se encuentra prestado');
      }

      const prestamo = manager.create(PrestamosCuaderno, {
        comprobante: { id: dto.comprobanteId } as ComprobantesC31,
        gestion: dto.gestion,
        quienRemite: dto.quienRemite,
        aQuienSePresta: dto.aQuienSePresta,
        estadoPrestamo: 'PRESTADO',
        creadoPorId: usuario.id,
      });
      const guardado = await manager.save(PrestamosCuaderno, prestamo);

      comprobante.estadoFisico = EstadoFisicoC31.PRESTADO;
      await manager.save(ComprobantesC31, comprobante);

      const completo = await manager.findOne(PrestamosCuaderno, {
        where: { id: guardado.id },
        relations: { comprobante: true },
      });
      if (!completo)
        throw new NotFoundException('No se pudo recuperar el préstamo creado');
      return completo;
    });
  }

  async findAll(
    query: FilterPrestamosCuadernoDto,
  ): Promise<PaginatedResponseDto<PrestamosCuaderno>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const where: Record<string, any> = {};
    if (query.estadoPrestamo) where.estadoPrestamo = query.estadoPrestamo;
    if (query.gestion) where.gestion = query.gestion;
    if (query.comprobanteId) where.comprobante = { id: query.comprobanteId };

    const [data, total] = await this.repo.findAndCount({
      where,
      relations: { comprobante: true, creadoPor: true },
      order: { fechaCreacion: query.order ?? 'DESC' },
      skip: paginationSkip(page, pageSize),
      take: pageSize,
    });

    return new PaginatedResponseDto(data, total, page, pageSize);
  }

  async findOne(id: number): Promise<PrestamosCuaderno> {
    const prestamo = await this.repo.findOne({
      where: { id },
      relations: { comprobante: true, creadoPor: true },
    });
    if (!prestamo) throw new NotFoundException('El préstamo no existe');
    return prestamo;
  }

  async update(
    id: number,
    dto: UpdatePrestamosCuadernoDto,
  ): Promise<PrestamosCuaderno> {
    const prestamo = await this.findOne(id);
    if (prestamo.estadoPrestamo === 'DEVUELTO') {
      throw new ConflictException(
        'No se puede modificar un préstamo ya devuelto',
      );
    }
    Object.assign(prestamo, {
      gestion: dto.gestion ?? prestamo.gestion,
      quienRemite: dto.quienRemite ?? prestamo.quienRemite,
      aQuienSePresta: dto.aQuienSePresta ?? prestamo.aQuienSePresta,
    });
    return this.repo.save(prestamo);
  }

  /** RF-03.3: registro de devolución */
  async devolver(id: number): Promise<PrestamosCuaderno> {
    return this.dataSource.transaction(async (manager) => {
      const prestamo = await manager.findOne(PrestamosCuaderno, {
        where: { id },
        relations: { comprobante: true },
      });
      if (!prestamo) throw new NotFoundException('El préstamo no existe');
      if (prestamo.estadoPrestamo === 'DEVUELTO') {
        throw new ConflictException('El préstamo ya fue devuelto');
      }

      prestamo.estadoPrestamo = 'DEVUELTO';
      await manager.save(PrestamosCuaderno, prestamo);

      if (prestamo.comprobante?.id) {
        await manager.update(ComprobantesC31, prestamo.comprobante.id, {
          estadoFisico: EstadoFisicoC31.EN_ARCHIVO,
        });
      }

      const completo = await manager.findOne(PrestamosCuaderno, {
        where: { id },
        relations: { comprobante: true },
      });
      if (!completo) throw new NotFoundException('El préstamo no existe');
      return completo;
    });
  }

  async remove(id: number): Promise<PrestamosCuaderno> {
    const prestamo = await this.findOne(id);
    return this.repo.softRemove(prestamo);
  }
}
