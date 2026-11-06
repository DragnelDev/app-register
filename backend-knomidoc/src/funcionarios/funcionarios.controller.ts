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
import { Roles } from '../auth/decorators/roles.decorator';
import { FuncionariosService } from './funcionarios.service';
import { CreateFuncionarioDto } from './dto/create-funcionario.dto';
import { UpdateFuncionarioDto } from './dto/update-funcionario.dto';
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

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
