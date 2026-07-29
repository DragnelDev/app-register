import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePrestamosNotaDetalleDto } from './dto/create-prestamos-nota-detalle.dto';
import { UpdatePrestamosNotaDetalleDto } from './dto/update-prestamos-nota-detalle.dto';
import { PrestamosNotaDetalle } from './entities/prestamos-nota-detalle.entity';
import { PrestamosNota } from '../prestamos-nota/entities/prestamos-nota.entity';
import { ComprobantesC31 } from '../comprobantes_c31/entities/comprobantes_c31.entity';
import { Carpeta } from '../carpetas/entities/carpeta.entity';

@Injectable()
export class PrestamosNotaDetalleService {
  constructor(
    @InjectRepository(PrestamosNotaDetalle)
    private readonly repo: Repository<PrestamosNotaDetalle>,
  ) {}

  create(dto: CreatePrestamosNotaDetalleDto) {
    const detalle = this.repo.create({
      prestamoNota: { id: dto.prestamoNotaId } as PrestamosNota,
      comprobante: dto.comprobanteId
        ? ({ id: dto.comprobanteId } as ComprobantesC31)
        : undefined,
      carpeta: dto.carpetaId ? ({ id: dto.carpetaId } as Carpeta) : undefined,
      estadoItem: 'PRESTADO',
    });
    return this.repo.save(detalle);
  }

  findAll(prestamoNotaId?: number) {
    return this.repo.find({
      where: prestamoNotaId ? { prestamoNota: { id: prestamoNotaId } } : {},
      relations: { prestamoNota: true, comprobante: true, carpeta: true },
    });
  }

  async findOne(id: number) {
    const item = await this.repo.findOne({
      where: { id },
      relations: { prestamoNota: true, comprobante: true, carpeta: true },
    });
    if (!item) throw new NotFoundException('El detalle de préstamo no existe');
    return item;
  }

  async update(id: number, dto: UpdatePrestamosNotaDetalleDto) {
    const item = await this.findOne(id);
    if (dto.estadoItem) item.estadoItem = dto.estadoItem;
    return this.repo.save(item);
  }

  async remove(id: number) {
    const item = await this.findOne(id);
    return this.repo.remove(item);
  }
}
