import { Injectable } from '@nestjs/common';
import { CreateC31DevengadoDto } from './dto/create-c31-devengado.dto';
import { UpdateC31DevengadoDto } from './dto/update-c31-devengado.dto';

@Injectable()
export class C31DevengadosService {
  create(createC31DevengadoDto: CreateC31DevengadoDto) {
    return 'This action adds a new c31Devengado';
  }

  findAll() {
    return `This action returns all c31Devengados`;
  }

  findOne(id: number) {
    return `This action returns a #${id} c31Devengado`;
  }

  update(id: number, updateC31DevengadoDto: UpdateC31DevengadoDto) {
    return `This action updates a #${id} c31Devengado`;
  }

  remove(id: number) {
    return `This action removes a #${id} c31Devengado`;
  }
}
