import { Injectable } from '@nestjs/common';
import { CreateC31BeneficiarioDto } from './dto/create-c31-beneficiario.dto';
import { UpdateC31BeneficiarioDto } from './dto/update-c31-beneficiario.dto';

@Injectable()
export class C31BeneficiariosService {
  create(createC31BeneficiarioDto: CreateC31BeneficiarioDto) {
    return 'This action adds a new c31Beneficiario';
  }

  findAll() {
    return `This action returns all c31Beneficiarios`;
  }

  findOne(id: number) {
    return `This action returns a #${id} c31Beneficiario`;
  }

  update(id: number, updateC31BeneficiarioDto: UpdateC31BeneficiarioDto) {
    return `This action updates a #${id} c31Beneficiario`;
  }

  remove(id: number) {
    return `This action removes a #${id} c31Beneficiario`;
  }
}
