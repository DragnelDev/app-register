import { Injectable } from '@nestjs/common';
import { CreateNotasEntregaDto } from './dto/create-notas-entrega.dto';
import { UpdateNotasEntregaDto } from './dto/update-notas-entrega.dto';

@Injectable()
export class NotasEntregaService {
  create(createNotasEntregaDto: CreateNotasEntregaDto) {
    return 'This action adds a new notasEntrega';
  }

  findAll() {
    return `This action returns all notasEntrega`;
  }

  findOne(id: number) {
    return `This action returns a #${id} notasEntrega`;
  }

  update(id: number, updateNotasEntregaDto: UpdateNotasEntregaDto) {
    return `This action updates a #${id} notasEntrega`;
  }

  remove(id: number) {
    return `This action removes a #${id} notasEntrega`;
  }
}
