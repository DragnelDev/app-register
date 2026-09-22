import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { PrestamosCuadernoService } from './prestamos-cuaderno.service';
import { CreatePrestamosCuadernoDto } from './dto/create-prestamos-cuaderno.dto';
import { UpdatePrestamosCuadernoDto } from './dto/update-prestamos-cuaderno.dto';
import { DevolverPrestamosCuadernoDto } from './dto/devolver-prestamos-cuaderno.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { FilterPrestamosCuadernoDto } from './dto/filter-prestamos-cuaderno.dto';

@ApiTags('prestamos-cuaderno')
@ApiBearerAuth()
@Controller('prestamos-cuaderno')
export class PrestamosCuadernoController {
  constructor(
    private readonly prestamosCuadernoService: PrestamosCuadernoService,
  ) {}

  @Roles('ADMIN', 'ENCARGADO_PRESTAMOS')
  @Post()
  create(@Body() createPrestamosCuadernoDto: CreatePrestamosCuadernoDto) {
    return this.prestamosCuadernoService.create(createPrestamosCuadernoDto);
  }

  @Get()
  findAll(@Query() query: FilterPrestamosCuadernoDto) {
    return this.prestamosCuadernoService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.prestamosCuadernoService.findOne(id);
  }

  @Roles('ADMIN', 'ENCARGADO_PRESTAMOS')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePrestamosCuadernoDto: UpdatePrestamosCuadernoDto,
  ) {
    return this.prestamosCuadernoService.update(id, updatePrestamosCuadernoDto);
  }

  @Roles('ADMIN', 'ENCARGADO_PRESTAMOS')
  @Patch(':id/devolver')
  devolver(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DevolverPrestamosCuadernoDto,
  ) {
    return this.prestamosCuadernoService.devolver(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.prestamosCuadernoService.remove(id);
  }
}
