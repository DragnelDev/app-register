import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Deposito } from './entities/deposito.entity';
import {
  CreateDepositoDto,
  UpdateDepositoDto,
} from './dto/create-deposito.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { paginationSkip } from '../common/utils/pagination.util';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Estante } from '../estantes/entities/estante.entity';

export interface DepositoConConteo extends Deposito {
  totalEstantes: number;
}

@Injectable()
export class DepositosService {
  constructor(
    @InjectRepository(Deposito)
    private readonly repo: Repository<Deposito>,
    @InjectRepository(Estante)
    private readonly estantesRepo: Repository<Estante>,
  ) {}

  /** El código es único incluso entre registros eliminados (soft delete). */
  private async codigoEnUso(codigo: string): Promise<boolean> {
    const total = await this.repo.count({
      where: { codigo },
      withDeleted: true,
    });
    return total > 0;
  }

  async create(dto: CreateDepositoDto, usuario: Usuario): Promise<Deposito> {
    if (await this.codigoEnUso(dto.codigo as string)) {
      throw new ConflictException('Ya existe un depósito con ese código');
    }
    return this.repo.save(
      this.repo.create({ ...dto, creadoPorId: usuario.id }),
    );
  }

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<DepositoConConteo>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const like = query.search ? `%${query.search}%` : undefined;

    const [data, total] = await this.repo.findAndCount({
      where: like
        ? [
            { codigo: ILike(like) },
            { nombre: ILike(like) },
            { ubicacion: ILike(like) },
          ]
        : {},
      order: { codigo: 'ASC' },
      skip: paginationSkip(page, pageSize),
      take: pageSize,
    });

    const conteos = await this.contarEstantes(data.map((d) => d.id as number));
    const conConteo = data.map((d) =>
      Object.assign(d, { totalEstantes: conteos.get(d.id as number) ?? 0 }),
    );
    return new PaginatedResponseDto(conConteo, total, page, pageSize);
  }

  /** Lista liviana (sin paginar) para selectores. */
  findOptions(): Promise<Deposito[]> {
    return this.repo.find({
      where: { activo: true },
      order: { codigo: 'ASC' },
    });
  }

  async findOne(id: number): Promise<DepositoConConteo> {
    const deposito = await this.repo.findOne({ where: { id } });
    if (!deposito) throw new NotFoundException('El depósito no existe');
    const conteos = await this.contarEstantes([id]);
    return Object.assign(deposito, { totalEstantes: conteos.get(id) ?? 0 });
  }

  async update(id: number, dto: UpdateDepositoDto): Promise<Deposito> {
    const deposito = await this.findOne(id);
    if (dto.codigo && dto.codigo !== deposito.codigo) {
      if (await this.codigoEnUso(dto.codigo as string)) {
        throw new ConflictException('Ya existe un depósito con ese código');
      }
    }
    if (dto.activo === false && deposito.totalEstantes > 0) {
      const activos = await this.estantesRepo.countBy({
        depositoId: id,
        activo: true,
      });
      if (activos > 0) {
        throw new ConflictException(
          'No se puede desactivar un depósito que tiene estantes activos',
        );
      }
    }
    const { totalEstantes: _omit, ...entidad } = deposito;
    void _omit;
    Object.assign(entidad, dto);
    return this.repo.save(entidad as Deposito);
  }

  async remove(id: number): Promise<Deposito> {
    const deposito = await this.findOne(id);
    if (deposito.totalEstantes > 0) {
      throw new ConflictException(
        'No se puede eliminar un depósito que tiene estantes registrados',
      );
    }
    const { totalEstantes: _omit, ...entidad } = deposito;
    void _omit;
    return this.repo.softRemove(entidad as Deposito);
  }

  private async contarEstantes(ids: number[]): Promise<Map<number, number>> {
    const mapa = new Map<number, number>();
    if (ids.length === 0) return mapa;
    const filas = await this.estantesRepo
      .createQueryBuilder('e')
      .select('e.deposito_id', 'depositoId')
      .addSelect('COUNT(*)', 'total')
      .where('e.deposito_id IN (:...ids)', { ids })
      .groupBy('e.deposito_id')
      .getRawMany<{ depositoId: number; total: string }>();
    filas.forEach((f) => mapa.set(Number(f.depositoId), Number(f.total)));
    return mapa;
  }
}
