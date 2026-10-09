import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { CreateCarpetaDto } from './dto/create-carpeta.dto';
import { UpdateCarpetaDto } from './dto/update-carpeta.dto';
import { FilterCarpetasDto } from './dto/filter-carpetas.dto';
import { Carpeta } from './entities/carpeta.entity';
import { Estante } from '../estantes/entities/estante.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { paginationSkip } from '../common/utils/pagination.util';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Injectable()
export class CarpetasService {
  constructor(
    @InjectRepository(Carpeta)
    private readonly carpetasRepository: Repository<Carpeta>,
    @InjectRepository(Estante)
    private readonly estantesRepository: Repository<Estante>,
  ) {}

  /** El código es único incluso entre carpetas eliminadas (soft delete). */
  private async validarCodigoLibre(codigo: string, excluirId?: number) {
    const existente = await this.carpetasRepository.findOne({
      where: { codigoCarpeta: codigo },
      withDeleted: true,
    });
    if (existente && existente.id !== excluirId) {
      throw new ConflictException(
        existente.fechaEliminacion
          ? 'Ese código perteneció a una carpeta eliminada y no puede reutilizarse'
          : 'Ya existe una carpeta con ese código',
      );
    }
  }

  /** Valida el estante y devuelve una ubicación legible "DEPÓSITO / ESTANTE". */
  private async resolverEstante(estanteId: number): Promise<string> {
    const estante = await this.estantesRepository.findOne({
      where: { id: estanteId },
      relations: { deposito: true },
    });
    if (!estante)
      throw new BadRequestException('El estante indicado no existe');
    if (!estante.activo) {
      throw new BadRequestException('El estante indicado está inactivo');
    }
    return `${estante.deposito?.codigo ?? 'S/D'} / ${estante.codigo}`;
  }

  async create(dto: CreateCarpetaDto, usuario: Usuario): Promise<Carpeta> {
    await this.validarCodigoLibre(dto.codigoCarpeta as string);

    let ubicacionFisica = dto.ubicacionFisica;
    if (dto.estanteId !== undefined) {
      const base = await this.resolverEstante(dto.estanteId);
      ubicacionFisica = ubicacionFisica ? `${base} - ${ubicacionFisica}` : base;
    }
    if (!ubicacionFisica) {
      throw new BadRequestException(
        'Indique el estante o la ubicación física de la carpeta',
      );
    }

    const carpeta = this.carpetasRepository.create({
      ...dto,
      ubicacionFisica,
      creadoPorId: usuario.id,
    });
    const guardada = await this.carpetasRepository.save(carpeta);
    return this.findOne(guardada.id as number);
  }

  async findAll(
    query: FilterCarpetasDto,
  ): Promise<PaginatedResponseDto<Carpeta>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const base: FindOptionsWhere<Carpeta> = {};
    if (query.estanteId) base.estanteId = query.estanteId;
    if (query.estadoFisico) base.estadoFisico = query.estadoFisico;
    if (query.depositoId) base.estante = { depositoId: query.depositoId };

    const like = query.search ? `%${query.search}%` : undefined;
    const where: FindOptionsWhere<Carpeta>[] = like
      ? [
          { ...base, codigoCarpeta: ILike(like) },
          { ...base, ubicacionFisica: ILike(like) },
        ]
      : [base];

    const [data, total] = await this.carpetasRepository.findAndCount({
      where,
      relations: { estante: { deposito: true } },
      order: { id: query.order ?? 'DESC' },
      skip: paginationSkip(page, pageSize),
      take: pageSize,
    });

    return new PaginatedResponseDto(data, total, page, pageSize);
  }

  async findOne(id: number): Promise<Carpeta> {
    const carpeta = await this.carpetasRepository.findOne({
      where: { id },
      relations: { estante: { deposito: true } },
    });
    if (!carpeta) throw new NotFoundException('La carpeta no existe');
    return carpeta;
  }

  async update(id: number, dto: UpdateCarpetaDto): Promise<Carpeta> {
    const carpeta = await this.findOne(id);

    if (dto.codigoCarpeta && dto.codigoCarpeta !== carpeta.codigoCarpeta) {
      await this.validarCodigoLibre(dto.codigoCarpeta, id);
    }

    if (dto.estanteId !== undefined && dto.estanteId !== carpeta.estanteId) {
      const base = await this.resolverEstante(dto.estanteId);
      // Al cambiar de estante, la referencia libre se rearma sobre el nuevo estante.
      dto = {
        ...dto,
        ubicacionFisica: dto.ubicacionFisica
          ? `${base} - ${dto.ubicacionFisica}`
          : base,
      };
    }

    const { estante: _estante, ...entidad } = carpeta;
    void _estante;
    Object.assign(entidad, dto);
    await this.carpetasRepository.save(entidad as Carpeta);
    return this.findOne(id);
  }

  async remove(id: number): Promise<Carpeta> {
    const carpeta = await this.findOne(id);
    if (carpeta.estadoFisico === 'PRESTADO') {
      throw new ConflictException(
        'No se puede eliminar una carpeta que está prestada',
      );
    }
    return this.carpetasRepository.softRemove(carpeta);
  }
}
