import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateC31ChequeDto } from './dto/create-c31-cheque.dto';
import { UpdateC31ChequeDto } from './dto/update-c31-cheque.dto';
import { C31Cheque } from './entities/c31-cheque.entity';

@Injectable()
export class C31ChequesService {
  constructor(
    @InjectRepository(C31Cheque)
    private readonly repo: Repository<C31Cheque>,
  ) {}

  create(dto: CreateC31ChequeDto) {
    const entidad = this.repo.create({
      numeroCheque: dto.numeroCheque,
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

  async update(id: number, dto: UpdateC31ChequeDto) {
    const item = await this.findOne(id);
    Object.assign(
      item,
      dto.numeroCheque ? { numeroCheque: dto.numeroCheque } : {},
    );
    return this.repo.save(item);
  }

  async remove(id: number) {
    const item = await this.findOne(id);
    return this.repo.remove(item);
  }
}
