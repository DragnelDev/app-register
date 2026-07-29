import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateC31CarpetasUbicacionDto } from './dto/create-c31-carpetas-ubicacion.dto';
import { UpdateC31CarpetasUbicacionDto } from './dto/update-c31-carpetas-ubicacion.dto';
import { C31CarpetasUbicacion } from './entities/c31-carpetas-ubicacion.entity';

@Injectable()
export class C31CarpetasUbicacionService {
  constructor(
    @InjectRepository(C31CarpetasUbicacion)
    private readonly repo: Repository<C31CarpetasUbicacion>,
  ) {}

  async create(dto: CreateC31CarpetasUbicacionDto) {
    const totalActual = await this.repo.count({
      where: { comprobante: { id: dto.comprobanteId } },
    });
    if (totalActual >= 5) {
      throw new ConflictException(
        'Este comprobante ya ocupa el máximo de 5 carpetas',
      );
    }

    const entidad = this.repo.create({
      numeroParte: dto.numeroParte,
      comprobante: { id: dto.comprobanteId } as any,
      carpeta: { id: dto.carpetaId } as any,
    });
    return this.repo.save(entidad);
  }

  findAll(comprobanteId?: number) {
    return this.repo.find({
      where: comprobanteId ? { comprobante: { id: comprobanteId } } : {},
      relations: { comprobante: true, carpeta: true },
      order: { numeroParte: 'ASC' },
    });
  }

  async findOne(id: number) {
    const item = await this.repo.findOne({
      where: { id },
      relations: { comprobante: true, carpeta: true },
    });
    if (!item) throw new NotFoundException('Registro no encontrado');
    return item;
  }

  async update(id: number, dto: UpdateC31CarpetasUbicacionDto) {
    const item = await this.findOne(id);
    if (dto.numeroParte !== undefined) item.numeroParte = dto.numeroParte;
    if (dto.carpetaId !== undefined)
      item.carpeta = { id: dto.carpetaId } as any;
    return this.repo.save(item);
  }

  async remove(id: number) {
    const item = await this.findOne(id);
    return this.repo.remove(item);
  }
}
