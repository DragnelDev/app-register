import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResumenService } from './resumen.service';

@ApiTags('resumen')
@ApiBearerAuth()
@Controller('resumen')
export class ResumenController {
  constructor(private readonly service: ResumenService) {}

  /** Cualquier usuario autenticado: alimenta panel principal e insignias del menú. */
  @Get()
  obtener() {
    return this.service.obtener();
  }
}
