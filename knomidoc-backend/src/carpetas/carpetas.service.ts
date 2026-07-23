import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { CreateCarpetaDto } from './dto/create-carpeta.dto';
import { UpdateCarpetaDto } from './dto/update-carpeta.dto';
import { Carpeta } from './entities/carpeta.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { paginationSkip } from '../common/utils/pagination.util';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Injectable()
export class CarpetasService {
  constructor(
    @InjectRepository(Carpeta)
    private readonly carpetasRepository: Repository<Carpeta>,
  ) {}

  async create(dto: CreateCarpetaDto, usuario: Usuario): Promise<Carpeta> {
    const existente = await this.carpetasRepository.findOneBy({
      codigoCarpeta: dto.codigoCarpeta,
    });
    if (existente) {
      throw new ConflictException('Ya existe una carpeta con ese código');
    }

    const carpeta = this.carpetasRepository.create({
      ...dto,
      creadoPorId: usuario.id,
    });
    return this.carpetasRepository.save(carpeta);
  }

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<Carpeta>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const [data, total] = await this.carpetasRepository.findAndCount({
      where: query.search
        ? [
            { codigoCarpeta: Like(`%${query.search}%`) },
            { ubicacionFisica: Like(`%${query.search}%`) },
          ]
        : {},
      order: { id: query.order ?? 'DESC' },
      skip: paginationSkip(page, pageSize),
      take: pageSize,
    });

    return new PaginatedResponseDto(data, total, page, pageSize);
  }

  async findOne(id: number): Promise<Carpeta> {
    const carpeta = await this.carpetasRepository.findOne({ where: { id } });
    if (!carpeta) throw new NotFoundException('La carpeta no existe');
    return carpeta;
  }

  async update(id: number, dto: UpdateCarpetaDto): Promise<Carpeta> {
    const carpeta = await this.findOne(id);

    if (dto.codigoCarpeta && dto.codigoCarpeta !== carpeta.codigoCarpeta) {
      const existente = await this.carpetasRepository.findOneBy({
        codigoCarpeta: dto.codigoCarpeta,
      });
      if (existente) {
        throw new ConflictException('Ya existe una carpeta con ese código');
      }
    }

    Object.assign(carpeta, dto);
    return this.carpetasRepository.save(carpeta);
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
