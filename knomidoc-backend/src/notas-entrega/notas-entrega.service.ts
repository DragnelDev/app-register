import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Like, Repository } from 'typeorm';
import { CreateNotasEntregaDto } from './dto/create-notas-entrega.dto';
import { UpdateNotasEntregaDto } from './dto/update-notas-entrega.dto';
import { NotasEntrega } from './entities/notas-entrega.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { paginationSkip } from '../common/utils/pagination.util';
import { Usuario } from '../usuarios/entities/usuario.entity';

export interface NotasEntregaFilterDto extends PaginationQueryDto {
  fechaDesde?: string;
  fechaHasta?: string;
}

@Injectable()
export class NotasEntregaService {
  constructor(
    @InjectRepository(NotasEntrega)
    private readonly repo: Repository<NotasEntrega>,
  ) {}

  async create(
    dto: CreateNotasEntregaDto,
    usuario: Usuario,
    imagenUrl?: string,
  ): Promise<NotasEntrega> {
    const nota = this.repo.create({
      ...dto,
      imagenUrl: imagenUrl ?? dto.imagenUrl,
      creadoPorId: usuario.id,
    });
    return this.repo.save(nota);
  }

  async findAll(
    query: NotasEntregaFilterDto,
  ): Promise<PaginatedResponseDto<NotasEntrega>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const where: Record<string, any> = {};
    if (query.fechaDesde && query.fechaHasta) {
      where.fechaEntrega = Between(query.fechaDesde, query.fechaHasta);
    }

    const [data, total] = await this.repo.findAndCount({
      where: query.search
        ? [
            { ...where, numeroNota: Like(`%${query.search}%`) },
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

  async findOne(id: number): Promise<NotasEntrega> {
    const nota = await this.repo.findOne({
      where: { id },
      relations: { creadoPor: true, comprobantesC31: true },
    });
    if (!nota) throw new NotFoundException('La nota de entrega no existe');
    return nota;
  }

  async update(
    id: number,
    dto: UpdateNotasEntregaDto,
    imagenUrl?: string,
  ): Promise<NotasEntrega> {
    const nota = await this.findOne(id);
    Object.assign(nota, dto);
    if (imagenUrl) nota.imagenUrl = imagenUrl;
    return this.repo.save(nota);
  }

  async remove(id: number): Promise<NotasEntrega> {
    const nota = await this.findOne(id);
    return this.repo.softRemove(nota);
  }
}
