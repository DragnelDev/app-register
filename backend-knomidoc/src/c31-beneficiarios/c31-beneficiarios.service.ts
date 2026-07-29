import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateC31BeneficiarioDto } from './dto/create-c31-beneficiario.dto';
import { UpdateC31BeneficiarioDto } from './dto/update-c31-beneficiario.dto';
import { C31Beneficiario } from './entities/c31-beneficiario.entity';

@Injectable()
export class C31BeneficiariosService {
  constructor(
    @InjectRepository(C31Beneficiario)
    private readonly repo: Repository<C31Beneficiario>,
  ) {}

  create(dto: CreateC31BeneficiarioDto) {
    const entidad = this.repo.create({
      nombreBeneficiario: dto.nombreBeneficiario,
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

  async update(id: number, dto: UpdateC31BeneficiarioDto) {
    const item = await this.findOne(id);
    Object.assign(
      item,
      dto.nombreBeneficiario
        ? { nombreBeneficiario: dto.nombreBeneficiario }
        : {},
    );
    return this.repo.save(item);
  }

  async remove(id: number) {
    const item = await this.findOne(id);
    return this.repo.remove(item);
  }
}
