import { PartialType } from '@nestjs/swagger';
import { CreateC31CarpetasUbicacionDto } from './create-c31-carpetas-ubicacion.dto';

export class UpdateC31CarpetasUbicacionDto extends PartialType(
  CreateC31CarpetasUbicacionDto,
) {}
