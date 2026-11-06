import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EstadoFuncionario, Funcionario } from './entities/funcionario.entity';
import { CreateFuncionarioDto } from './dto/create-funcionario.dto';
import { UpdateFuncionarioDto } from './dto/update-funcionario.dto';
import { FilterFuncionariosDto } from './dto/filter-funcionarios.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { paginationSkip } from '../common/utils/pagination.util';
import { PrestamosNota } from '../prestamos-nota/entities/prestamos-nota.entity';
import { PrestamosCuaderno } from '../prestamos-cuaderno/entities/prestamos-cuaderno.entity';

@Injectable()
export class FuncionariosService {
  constructor(
    @InjectRepository(Funcionario)
    private readonly repo: Repository<Funcionario>,
    private readonly dataSource: DataSource,
  ) {}

  private async validarCiUnico(ci: string, excluirId?: number) {
    const qb = this.repo
      .createQueryBuilder('f')
      .where('UPPER(f.ci) = UPPER(:ci)', { ci });
    if (excluirId) qb.andWhere('f.id <> :excluirId', { excluirId });
    if (await qb.getExists()) {
      throw new ConflictException(`Ya existe un funcionario con el CI ${ci}`);
    }
  }

  async create(dto: CreateFuncionarioDto): Promise<Funcionario> {
    await this.validarCiUnico(dto.ci as string);
    return this.repo.save(
      this.repo.create({
        ...dto,
        estado: dto.estado ?? EstadoFuncionario.ACTIVO,
      }),
    );
  }

  /** Búsqueda por CI o nombre (nombres, apellidos o "nombres apellidos"). */
  async findAll(
    query: FilterFuncionariosDto,
  ): Promise<PaginatedResponseDto<Funcionario>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const qb = this.repo.createQueryBuilder('f');
    if (query.estado)
      qb.andWhere('f.estado = :estado', { estado: query.estado });
    const texto = query.search?.trim();
    if (texto) {
      qb.andWhere(
        `(f.ci ILIKE :like
          OR f.nombres ILIKE :like
          OR f.apellidos ILIKE :like
          OR (f.nombres || ' ' || f.apellidos) ILIKE :like
          OR f.unidad_oficina ILIKE :like)`,
        { like: `%${texto}%` },
      );
    }
    qb.orderBy('f.apellidos', 'ASC')
      .addOrderBy('f.nombres', 'ASC')
      .skip(paginationSkip(page, pageSize))
      .take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResponseDto(data, total, page, pageSize);
  }

  async findOne(id: number): Promise<Funcionario> {
    const funcionario = await this.repo.findOne({ where: { id } });
    if (!funcionario) throw new NotFoundException('El funcionario no existe');
    return funcionario;
  }

  async update(id: number, dto: UpdateFuncionarioDto): Promise<Funcionario> {
    const funcionario = await this.findOne(id);
    if (dto.ci !== undefined && dto.ci !== funcionario.ci) {
      await this.validarCiUnico(dto.ci, id);
    }
    Object.assign(funcionario, dto);
    return this.repo.save(funcionario);
  }

  /**
   * Elimina (borrado lógico) solo si nunca recibió préstamos; si ya tiene
   * historial se debe desactivar para conservar la trazabilidad.
   */
  async remove(id: number): Promise<Funcionario> {
    const funcionario = await this.findOne(id);
    const [notas, cuaderno] = await Promise.all([
      this.dataSource.manager.countBy(PrestamosNota, { funcionarioId: id }),
      this.dataSource.manager.countBy(PrestamosCuaderno, {
        funcionarioId: id,
      }),
    ]);
    if (notas + cuaderno > 0) {
      throw new ConflictException(
        'El funcionario tiene préstamos registrados: no se puede eliminar, márquelo como Inactivo',
      );
    }
    return this.repo.softRemove(funcionario);
  }
}
