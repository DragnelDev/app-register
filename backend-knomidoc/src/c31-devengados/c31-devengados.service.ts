import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateC31DevengadoDto } from './dto/create-c31-devengado.dto';
import { UpdateC31DevengadoDto } from './dto/update-c31-devengado.dto';
import { C31Devengado } from './entities/c31-devengado.entity';

@Injectable()
export class C31DevengadosService {
  constructor(
    @InjectRepository(C31Devengado)
    private readonly repo: Repository<C31Devengado>,
  ) {}

  create(dto: CreateC31DevengadoDto) {
    const entidad = this.repo.create({
      numeroDevengado: dto.numeroDevengado,
      comprobante: { id: dto.comprobanteId } as any,
    });
    return this.repo.save(entidad);
  }

  findAll(comprobanteId?: number) {
    return this.repo.find({
      where: comprobanteId ? { comprobante: { id: comprobanteId } } : {},
      relations: { comprobante: true },
    });
  }

  async findOne(id: number) {
    const item = await this.repo.findOne({
      where: { id },
      relations: { comprobante: true },
    });
    if (!item) throw new NotFoundException('Registro no encontrado');
    return item;
  }

  async update(id: number, dto: UpdateC31DevengadoDto) {
    const item = await this.findOne(id);
    Object.assign(
      item,
      dto.numeroDevengado ? { numeroDevengado: dto.numeroDevengado } : {},
    );
    return this.repo.save(item);
  }

  async remove(id: number) {
    const item = await this.findOne(id);
    return this.repo.remove(item);
  }
}
