import { Injectable } from '@nestjs/common';
import { CreateComprobantesC31Dto } from './dto/create-comprobantes_c31.dto';
import { UpdateComprobantesC31Dto } from './dto/update-comprobantes_c31.dto';

@Injectable()
export class ComprobantesC31Service {
  create(createComprobantesC31Dto: CreateComprobantesC31Dto) {
    return 'This action adds a new comprobantesC31';
  }

  findAll() {
    return `This action returns all comprobantesC31`;
  }

  findOne(id: number) {
    return `This action returns a #${id} comprobantesC31`;
  }

  update(id: number, updateComprobantesC31Dto: UpdateComprobantesC31Dto) {
    return `This action updates a #${id} comprobantesC31`;
  }

  remove(id: number) {
    return `This action removes a #${id} comprobantesC31`;
  }
}
