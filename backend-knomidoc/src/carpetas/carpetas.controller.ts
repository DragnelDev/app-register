import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { CarpetasService } from './carpetas.service';
import { CreateCarpetaDto } from './dto/create-carpeta.dto';
import { UpdateCarpetaDto } from './dto/update-carpeta.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { FilterCarpetasDto } from './dto/filter-carpetas.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('carpetas')
@ApiBearerAuth()
@Controller('carpetas')
export class CarpetasController {
  constructor(private readonly carpetasService: CarpetasService) {}

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS')
  @Post()
  create(
    @Body() createCarpetaDto: CreateCarpetaDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.carpetasService.create(createCarpetaDto, usuario);
  }

  @Get()
  findAll(@Query() query: FilterCarpetasDto) {
    return this.carpetasService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.carpetasService.findOne(id);
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCarpetaDto: UpdateCarpetaDto,
  ) {
    return this.carpetasService.update(id, updateCarpetaDto);
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.carpetasService.remove(id);
  }
}
