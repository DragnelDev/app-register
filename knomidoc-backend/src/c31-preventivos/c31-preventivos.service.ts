import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateC31PreventivoDto } from './dto/create-c31-preventivo.dto';
import { UpdateC31PreventivoDto } from './dto/update-c31-preventivo.dto';
import { C31Preventivo } from './entities/c31-preventivo.entity';

@Injectable()
export class C31PreventivosService {
  constructor(
    @InjectRepository(C31Preventivo)
    private readonly repo: Repository<C31Preventivo>,
  ) {}

  create(dto: CreateC31PreventivoDto) {
    const entidad = this.repo.create({
      numeroPreventivo: dto.numeroPreventivo,
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

  async update(id: number, dto: UpdateC31PreventivoDto) {
    const item = await this.findOne(id);
    Object.assign(
      item,
      dto.numeroPreventivo ? { numeroPreventivo: dto.numeroPreventivo } : {},
    );
    return this.repo.save(item);
  }

  async remove(id: number) {
    const item = await this.findOne(id);
    return this.repo.remove(item);
  }
}
