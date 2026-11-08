import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParametrosGestionService } from './parametros-gestion.service';
import {
  CreateParametroGestionDto,
  UpdateParametroGestionDto,
} from './dto/parametro-gestion.dto';
import { AbiertoASoloLectura } from '../auth/decorators/abierto-a-solo-lectura.decorator';
import { AbiertoATodosLosPerfiles } from '../auth/decorators/abierto-a-todos.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';

@ApiTags('parametros-gestion')
@ApiBearerAuth()
@Controller('parametros-gestion')
export class ParametrosGestionController {
  constructor(private readonly service: ParametrosGestionService) {}

  @Roles('ADMIN')
  @Post()
  create(
    @Body() dto: CreateParametroGestionDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.create(dto, usuario);
  }

  @AbiertoATodosLosPerfiles()
  @AbiertoASoloLectura()
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @AbiertoATodosLosPerfiles()
  @AbiertoASoloLectura()
  @Get('activa')
  findActiva() {
    return this.service.findActiva();
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateParametroGestionDto,
  ) {
    return this.service.update(id, dto);
  }

  @Roles('ADMIN')
  @Patch(':id/activar')
  activar(@Param('id', ParseIntPipe) id: number) {
    return this.service.activar(id);
  }

  @Roles('ADMIN')
  @Patch(':id/cerrar')
  cerrar(@Param('id', ParseIntPipe) id: number) {
    return this.service.cerrar(id);
  }

  @Roles('ADMIN')
  @Patch(':id/reabrir')
  reabrir(@Param('id', ParseIntPipe) id: number) {
    return this.service.reabrir(id);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
