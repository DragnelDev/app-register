import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Like, Repository } from 'typeorm';
import { CreateActasEntregaDto } from './dto/create-actas-entrega.dto';
import { UpdateActasEntregaDto } from './dto/update-actas-entrega.dto';
import { ActasEntrega } from './entities/actas-entrega.entity';
import { FilterActasEntregaDto } from './dto/filter-actas-entrega.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { paginationSkip } from '../common/utils/pagination.util';

@Injectable()
export class ActasEntregaService {
  constructor(
    @InjectRepository(ActasEntrega)
    private readonly repo: Repository<ActasEntrega>,
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

  async create(dto: CreateActasEntregaDto): Promise<ActasEntrega> {
    await this.validarNumeroActa(dto.numeroActa);
    const acta = this.repo.create({
      ...dto,
      unidadEmisora: dto.unidadEmisora || 'Tesorería',
      // cantidad_comprobantes la mantiene el módulo de comprobantes
      cantidadComprobantes: 0,
    });
    return this.repo.save(acta);
  }

  async findAll(
    query: FilterActasEntregaDto,
  ): Promise<PaginatedResponseDto<ActasEntrega>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const where: Record<string, any> = {};
    if (query.fechaDesde && query.fechaHasta) {
      where.fechaRecepcion = Between(query.fechaDesde, query.fechaHasta);
    }

    const [data, total] = await this.repo.findAndCount({
      where: query.search
        ? [
            { ...where, numeroActa: Like(`%${query.search}%`) },
            { ...where, responsableEntrega: Like(`%${query.search}%`) },
            { ...where, responsableRecepcion: Like(`%${query.search}%`) },
          ]
        : where,
      order: { fechaRecepcion: query.order ?? 'DESC', id: 'DESC' },
      skip: paginationSkip(page, pageSize),
      take: pageSize,
    });

    return new PaginatedResponseDto(data, total, page, pageSize);
  }

  async findOne(id: number): Promise<ActasEntrega> {
    const acta = await this.repo.findOne({
      where: { id },
      relations: {
        comprobantesC31: {
          preventivos: true,
          devengados: true,
          beneficiarios: true,
        },
      },
    });
    if (!acta) throw new NotFoundException('El acta de entrega no existe');
    return acta;
  }

  async update(id: number, dto: UpdateActasEntregaDto): Promise<ActasEntrega> {
    const acta = await this.findOne(id);
    if (dto.numeroActa && dto.numeroActa !== acta.numeroActa) {
      await this.validarNumeroActa(dto.numeroActa, id);
    }
    Object.assign(acta, dto);
    // cantidad_comprobantes no se edita a mano
    delete acta.comprobantesC31;
    await this.repo.save(acta);
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
