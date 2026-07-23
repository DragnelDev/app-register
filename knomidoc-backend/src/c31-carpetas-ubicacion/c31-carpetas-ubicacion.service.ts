import { Injectable } from '@nestjs/common';
import { CreateC31CarpetasUbicacionDto } from './dto/create-c31-carpetas-ubicacion.dto';
import { UpdateC31CarpetasUbicacionDto } from './dto/update-c31-carpetas-ubicacion.dto';

@Injectable()
export class C31CarpetasUbicacionService {
  create(createC31CarpetasUbicacionDto: CreateC31CarpetasUbicacionDto) {
    return 'This action adds a new c31CarpetasUbicacion';
  }

  findAll() {
    return `This action returns all c31CarpetasUbicacion`;
  }

  findOne(id: number) {
    return `This action returns a #${id} c31CarpetasUbicacion`;
  }

  update(
    id: number,
    updateC31CarpetasUbicacionDto: UpdateC31CarpetasUbicacionDto,
  ) {
    return `This action updates a #${id} c31CarpetasUbicacion`;
  }

  remove(id: number) {
    return `This action removes a #${id} c31CarpetasUbicacion`;
  }
}
