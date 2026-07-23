import { Injectable } from '@nestjs/common';
import { CreateC31PreventivoDto } from './dto/create-c31-preventivo.dto';
import { UpdateC31PreventivoDto } from './dto/update-c31-preventivo.dto';

@Injectable()
export class C31PreventivosService {
  create(createC31PreventivoDto: CreateC31PreventivoDto) {
    return 'This action adds a new c31Preventivo';
  }

  findAll() {
    return `This action returns all c31Preventivos`;
  }

  findOne(id: number) {
    return `This action returns a #${id} c31Preventivo`;
  }

  update(id: number, updateC31PreventivoDto: UpdateC31PreventivoDto) {
    return `This action updates a #${id} c31Preventivo`;
  }

  remove(id: number) {
    return `This action removes a #${id} c31Preventivo`;
  }
}
