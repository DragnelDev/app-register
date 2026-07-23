import { Injectable } from '@nestjs/common';
import { CreatePrestamosNotaDto } from './dto/create-prestamos-nota.dto';
import { UpdatePrestamosNotaDto } from './dto/update-prestamos-nota.dto';

@Injectable()
export class PrestamosNotaService {
  create(createPrestamosNotaDto: CreatePrestamosNotaDto) {
    return 'This action adds a new prestamosNota';
  }

  findAll() {
    return `This action returns all prestamosNota`;
  }

  findOne(id: number) {
    return `This action returns a #${id} prestamosNota`;
  }

  update(id: number, updatePrestamosNotaDto: UpdatePrestamosNotaDto) {
    return `This action updates a #${id} prestamosNota`;
  }

  remove(id: number) {
    return `This action removes a #${id} prestamosNota`;
  }
}
