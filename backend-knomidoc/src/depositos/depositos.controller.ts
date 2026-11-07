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
import { DepositosService } from './depositos.service';
import {
  CreateDepositoDto,
  UpdateDepositoDto,
} from './dto/create-deposito.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';

@ApiTags('depositos')
@ApiBearerAuth()
@Controller('depositos')
export class DepositosController {
  constructor(private readonly service: DepositosService) {}

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS')
  @Post()
  create(@Body() dto: CreateDepositoDto, @CurrentUser() usuario: Usuario) {
    return this.service.create(dto, usuario);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query);
  }

  // Ruta fija antes de ':id'
  @Get('opciones')
  findOptions() {
    return this.service.findOptions();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepositoDto,
  ) {
    return this.service.update(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
