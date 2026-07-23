import { Injectable } from '@nestjs/common';
import { CreatePrestamosCuadernoDto } from './dto/create-prestamos-cuaderno.dto';
import { UpdatePrestamosCuadernoDto } from './dto/update-prestamos-cuaderno.dto';

@Injectable()
export class PrestamosCuadernoService {
  create(createPrestamosCuadernoDto: CreatePrestamosCuadernoDto) {
    return 'This action adds a new prestamosCuaderno';
  }

  findAll() {
    return `This action returns all prestamosCuaderno`;
  }

  findOne(id: number) {
    return `This action returns a #${id} prestamosCuaderno`;
  }

  update(id: number, updatePrestamosCuadernoDto: UpdatePrestamosCuadernoDto) {
    return `This action updates a #${id} prestamosCuaderno`;
  }

  remove(id: number) {
    return `This action removes a #${id} prestamosCuaderno`;
  }
}
