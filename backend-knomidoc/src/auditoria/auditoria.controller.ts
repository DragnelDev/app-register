import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditoriaService } from './auditoria.service';
import { FilterAuditoriaDto } from './dto/filter-auditoria.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('auditoria')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly service: AuditoriaService) {}

  @Get()
  findAll(@Query() query: FilterAuditoriaDto) {
    return this.service.findAll(query);
  }

  @Get('filtros')
  findFiltros() {
    return this.service.findFiltros();
  }
}
