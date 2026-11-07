import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EstantesService } from './estantes.service';
import {
  CreateEstanteDto,
  FilterEstantesDto,
  UpdateEstanteDto,
} from './dto/create-estante.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';

@ApiTags('estantes')
@ApiBearerAuth()
@Controller('estantes')
export class EstantesController {
  constructor(private readonly service: EstantesService) {}

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS')
  @Post()
  create(@Body() dto: CreateEstanteDto, @CurrentUser() usuario: Usuario) {
    return this.service.create(dto, usuario);
  }

  @Get()
  findAll(@Query() query: FilterEstantesDto) {
    return this.service.findAll(query);
  }

  @Get('opciones')
  findOptions(@Query('depositoId') depositoId?: string) {
    return this.service.findOptions(
      depositoId ? Number(depositoId) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEstanteDto) {
    return this.service.update(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
