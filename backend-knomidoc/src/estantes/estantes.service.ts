import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { Estante } from './entities/estante.entity';
import { Deposito } from '../depositos/entities/deposito.entity';
import { Carpeta } from '../carpetas/entities/carpeta.entity';
import {
  CreateEstanteDto,
  FilterEstantesDto,
  UpdateEstanteDto,
} from './dto/create-estante.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { paginationSkip } from '../common/utils/pagination.util';
import { Usuario } from '../usuarios/entities/usuario.entity';

export interface EstanteConConteo extends Estante {
  totalCarpetas: number;
}

@Injectable()
export class EstantesService {
  constructor(
    @InjectRepository(Estante)
    private readonly repo: Repository<Estante>,
    @InjectRepository(Deposito)
    private readonly depositosRepo: Repository<Deposito>,
    @InjectRepository(Carpeta)
    private readonly carpetasRepo: Repository<Carpeta>,
  ) {}

  private async validarDeposito(depositoId?: number) {
    if (depositoId === undefined) return;
    const deposito = await this.depositosRepo.findOneBy({ id: depositoId });
    if (!deposito)
      throw new BadRequestException('El depósito indicado no existe');
    if (!deposito.activo) {
      throw new BadRequestException('El depósito indicado está inactivo');
    }
  }

  /** El código es único incluso entre registros eliminados (soft delete). */
  private async codigoEnUso(codigo: string): Promise<boolean> {
    const total = await this.repo.count({
      where: { codigo },
      withDeleted: true,
    });
    return total > 0;
  }

  async create(dto: CreateEstanteDto, usuario: Usuario): Promise<Estante> {
    if (await this.codigoEnUso(dto.codigo as string)) {
      throw new ConflictException('Ya existe un estante con ese código');
    }
    await this.validarDeposito(dto.depositoId);
    return this.repo.save(
      this.repo.create({ ...dto, creadoPorId: usuario.id }),
    );
  }

  async findAll(
    query: FilterEstantesDto,
  ): Promise<PaginatedResponseDto<EstanteConConteo>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const base: FindOptionsWhere<Estante> = {};
    if (query.depositoId) base.depositoId = query.depositoId;

    const like = query.search ? `%${query.search}%` : undefined;
    const where: FindOptionsWhere<Estante>[] = like
      ? [
          { ...base, codigo: ILike(like) },
          { ...base, descripcion: ILike(like) },
          { ...base, deposito: { nombre: ILike(like) } },
        ]
      : [base];

    const [data, total] = await this.repo.findAndCount({
      where,
      relations: { deposito: true },
      order: { codigo: 'ASC' },
      skip: paginationSkip(page, pageSize),
      take: pageSize,
    });

    const conteos = await this.contarCarpetas(data.map((e) => e.id as number));
    const conConteo = data.map((e) =>
      Object.assign(e, { totalCarpetas: conteos.get(e.id as number) ?? 0 }),
    );
    return new PaginatedResponseDto(conConteo, total, page, pageSize);
  }

  /** Lista liviana para selectores (estantes activos con su depósito). */
  findOptions(depositoId?: number): Promise<Estante[]> {
    return this.repo.find({
      where: depositoId ? { activo: true, depositoId } : { activo: true },
      relations: { deposito: true },
      order: { codigo: 'ASC' },
    });
  }

  async findOne(id: number): Promise<EstanteConConteo> {
    const estante = await this.repo.findOne({
      where: { id },
      relations: { deposito: true },
    });
    if (!estante) throw new NotFoundException('El estante no existe');
    const conteos = await this.contarCarpetas([id]);
    return Object.assign(estante, { totalCarpetas: conteos.get(id) ?? 0 });
  }

  async update(id: number, dto: UpdateEstanteDto): Promise<Estante> {
    const estante = await this.findOne(id);
    if (dto.codigo && dto.codigo !== estante.codigo) {
      if (await this.codigoEnUso(dto.codigo as string)) {
        throw new ConflictException('Ya existe un estante con ese código');
      }
    }
    if (dto.depositoId !== undefined && dto.depositoId !== estante.depositoId) {
      await this.validarDeposito(dto.depositoId);
    }
    if (dto.activo === false && estante.totalCarpetas > 0) {
      throw new ConflictException(
        'No se puede desactivar un estante que contiene carpetas',
      );
    }
    const { totalCarpetas: _omit, deposito: _dep, ...entidad } = estante;
    void _omit;
    void _dep;
    Object.assign(entidad, dto);
    await this.repo.save(entidad as Estante);
    return this.findOne(id);
  }

  async remove(id: number): Promise<Estante> {
    const estante = await this.findOne(id);
    if (estante.totalCarpetas > 0) {
      throw new ConflictException(
        'No se puede eliminar un estante que contiene carpetas',
      );
    }
    const { totalCarpetas: _omit, ...entidad } = estante;
    void _omit;
    return this.repo.softRemove(entidad as Estante);
  }

  private async contarCarpetas(ids: number[]): Promise<Map<number, number>> {
    const mapa = new Map<number, number>();
    if (ids.length === 0) return mapa;
    const filas = await this.carpetasRepo
      .createQueryBuilder('c')
      .select('c.estante_id', 'estanteId')
      .addSelect('COUNT(*)', 'total')
      .where('c.estante_id IN (:...ids)', { ids })
      .groupBy('c.estante_id')
      .getRawMany<{ estanteId: number; total: string }>();
    filas.forEach((f) => mapa.set(Number(f.estanteId), Number(f.total)));
    return mapa;
  }
}
