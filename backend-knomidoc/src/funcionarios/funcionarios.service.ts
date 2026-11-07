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
    if (query.unidad?.trim())
      qb.andWhere('f.unidad_oficina = :unidad', {
        unidad: query.unidad.trim(),
      });
    if (query.cargo?.trim())
      qb.andWhere('f.cargo ILIKE :cargo', { cargo: `%${query.cargo.trim()}%` });
    if (query.conHuella === 'true')
      qb.andWhere('f.huella_registrada_en IS NOT NULL');
    if (query.conHuella === 'false')
      qb.andWhere('f.huella_registrada_en IS NULL');
    if (query.conPrestamosActivos === 'true')
      qb.andWhere(
        `(EXISTS (SELECT 1 FROM prestamos_cuaderno pc WHERE pc.funcionario_id = f.id AND pc.devuelto = false)
          OR EXISTS (SELECT 1 FROM prestamos_nota pn WHERE pn.funcionario_id = f.id AND pn.estado_prestamo = 'ENTREGADO'))`,
      );
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

  /** Unidades registradas, para el filtro desplegable. */
  async unidades(): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder('f')
      .select('DISTINCT f.unidad_oficina', 'u')
      .orderBy('u')
      .getRawMany<{ u: string }>();
    return rows.map((r) => r.u);
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
  /** Enrola (o reemplaza) la huella del funcionario. */
  async registrarHuella(id: number, plantilla: string, lector = 'DEMO') {
    await this.findOne(id);
    await this.repo.update(id, {
      huellaPlantilla: plantilla,
      huellaRegistradaEn: new Date(),
      huellaLector: lector,
    });
    return this.findOne(id);
  }

  async quitarHuella(id: number) {
    await this.findOne(id);
    await this.repo.update(id, {
      huellaPlantilla: null,
      huellaRegistradaEn: null,
      huellaLector: null,
    });
    return this.findOne(id);
  }

  /**
   * Compara la plantilla capturada con la enrolada. En DEMO es una igualdad; con un
   * lector real aquí se invoca la comparación 1:1 del SDK del fabricante.
   */
  async verificarHuella(id: number, plantilla: string) {
    const f = await this.repo.findOne({
      where: { id },
      select: { id: true, huellaPlantilla: true },
    });
    if (!f) throw new NotFoundException('El funcionario no existe');
    if (!f.huellaPlantilla)
      throw new ConflictException('El funcionario no tiene huella registrada');
    return { coincide: f.huellaPlantilla === plantilla };
  }

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
