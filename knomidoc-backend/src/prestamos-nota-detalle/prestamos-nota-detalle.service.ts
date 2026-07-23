import { Injectable } from '@nestjs/common';
import { CreatePrestamosNotaDetalleDto } from './dto/create-prestamos-nota-detalle.dto';
import { UpdatePrestamosNotaDetalleDto } from './dto/update-prestamos-nota-detalle.dto';

@Injectable()
export class PrestamosNotaDetalleService {
  create(createPrestamosNotaDetalleDto: CreatePrestamosNotaDetalleDto) {
    return 'This action adds a new prestamosNotaDetalle';
  }

  findAll() {
    return `This action returns all prestamosNotaDetalle`;
  }

  findOne(id: number) {
    return `This action returns a #${id} prestamosNotaDetalle`;
  }

  update(
    id: number,
    updatePrestamosNotaDetalleDto: UpdatePrestamosNotaDetalleDto,
  ) {
    return `This action updates a #${id} prestamosNotaDetalle`;
  }

  remove(id: number) {
    return `This action removes a #${id} prestamosNotaDetalle`;
  }
}
