import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Like, Repository } from 'typeorm';
import { CreateActasEntregaDto } from './dto/create-actas-entrega.dto';
import { UpdateActasEntregaDto } from './dto/update-actas-entrega.dto';
import { ActasEntrega } from './entities/actas-entrega.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { paginationSkip } from '../common/utils/pagination.util';
import { Usuario } from '../usuarios/entities/usuario.entity';

export interface ActasEntregaFilterDto extends PaginationQueryDto {
  fechaDesde?: string;
  fechaHasta?: string;
}

@Injectable()
export class ActasEntregaService {
  constructor(
    @InjectRepository(ActasEntrega)
    private readonly repo: Repository<ActasEntrega>,
  ) {}

  async create(
    dto: CreateActasEntregaDto,
    usuario?: Usuario,
  ): Promise<ActasEntrega> {
    const nota = this.repo.create({
      ...dto,
      creadoPorId: usuario?.id,
    });
    return this.repo.save(nota);
  }

  async findAll(
    query: ActasEntregaFilterDto,
  ): Promise<PaginatedResponseDto<ActasEntrega>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const where: Record<string, any> = {};
    if (query.fechaDesde && query.fechaHasta) {
      where.fechaEntrega = Between(query.fechaDesde, query.fechaHasta);
    }

    const [data, total] = await this.repo.findAndCount({
      where: query.search
        ? [
            { ...where, numeroActa: Like(`%${query.search}%`) },
            { ...where, oficinaOrigen: Like(`%${query.search}%`) },
          ]
        : where,
      relations: { creadoPor: true },
      order: { fechaCreacion: query.order ?? 'DESC' },
      skip: paginationSkip(page, pageSize),
      take: pageSize,
    });

    return new PaginatedResponseDto(data, total, page, pageSize);
  }

  async findOne(id: number): Promise<ActasEntrega> {
    const nota = await this.repo.findOne({
      where: { id },
      relations: { creadoPor: true, comprobantesC31: true },
    });
    if (!nota) throw new NotFoundException('El acta de entrega no existe');
    return nota;
  }

  async update(id: number, dto: UpdateActasEntregaDto): Promise<ActasEntrega> {
    const nota = await this.findOne(id);
    Object.assign(nota, dto);
    return this.repo.save(nota);
  }

  async remove(id: number): Promise<ActasEntrega> {
    const nota = await this.findOne(id);
    return this.repo.softRemove(nota);
  }
}
