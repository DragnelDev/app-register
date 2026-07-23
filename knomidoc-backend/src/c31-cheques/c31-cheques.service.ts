import { Injectable } from '@nestjs/common';
import { CreateC31ChequeDto } from './dto/create-c31-cheque.dto';
import { UpdateC31ChequeDto } from './dto/update-c31-cheque.dto';

@Injectable()
export class C31ChequesService {
  create(createC31ChequeDto: CreateC31ChequeDto) {
    return 'This action adds a new c31Cheque';
  }

  findAll() {
    return `This action returns all c31Cheques`;
  }

  findOne(id: number) {
    return `This action returns a #${id} c31Cheque`;
  }

  update(id: number, updateC31ChequeDto: UpdateC31ChequeDto) {
    return `This action updates a #${id} c31Cheque`;
  }

  remove(id: number) {
    return `This action removes a #${id} c31Cheque`;
  }
}
