import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { FuncionariosService } from './funcionarios.service';
import { CreateFuncionarioDto } from './dto/create-funcionario.dto';
import { UpdateFuncionarioDto } from './dto/update-funcionario.dto';
import { HuellaDto } from './dto/huella.dto';
import { FilterFuncionariosDto } from './dto/filter-funcionarios.dto';

@ApiTags('funcionarios')
@ApiBearerAuth()
@Controller('funcionarios')
export class FuncionariosController {
  constructor(private readonly service: FuncionariosService) {}

  @Roles('ADMIN', 'ENCARGADO_PRESTAMOS')
  @Post()
  create(@Body() dto: CreateFuncionarioDto) {
    return this.service.create(dto);
  }

  /** ?search= (CI o nombre) &estado=ACTIVO. Sirve también para el autocompletado. */
  @Get()
  findAll(@Query() query: FilterFuncionariosDto) {
    return this.service.findAll(query);
  }

  @Get('unidades')
  unidades() {
    return this.service.unidades();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles('ADMIN', 'ENCARGADO_PRESTAMOS')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFuncionarioDto,
  ) {
    return this.service.update(id, dto);
  }

  @Roles('ADMIN', 'ENCARGADO_PRESTAMOS')
  @Put(':id/huella')
  registrarHuella(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: HuellaDto,
  ) {
    return this.service.registrarHuella(
      id,
      dto.plantilla as string,
      dto.lector,
    );
  }

  @Roles('ADMIN', 'ENCARGADO_PRESTAMOS')
  @Delete(':id/huella')
  quitarHuella(@Param('id', ParseIntPipe) id: number) {
    return this.service.quitarHuella(id);
  }

  @Roles('ADMIN', 'ENCARGADO_PRESTAMOS')
  @Post(':id/huella/verificar')
  verificarHuella(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: HuellaDto,
  ) {
    return this.service.verificarHuella(id, dto.plantilla as string);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
