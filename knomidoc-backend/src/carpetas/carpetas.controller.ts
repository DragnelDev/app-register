import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { CarpetasService } from './carpetas.service';
import { CreateCarpetaDto } from './dto/create-carpeta.dto';
import { UpdateCarpetaDto } from './dto/update-carpeta.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('carpetas')
@ApiBearerAuth()
@Controller('carpetas')
export class CarpetasController {
  constructor(private readonly carpetasService: CarpetasService) {}

  @Roles('ADMIN', 'REGISTRADOR')
  @Post()
  create(
    @Body() createCarpetaDto: CreateCarpetaDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.carpetasService.create(createCarpetaDto, usuario);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.carpetasService.findAll(query); // Pasa 'query'
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.carpetasService.findOne(+id);
  }

  @Roles('ADMIN', 'REGISTRADOR')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCarpetaDto: UpdateCarpetaDto) {
    return this.carpetasService.update(+id, updateCarpetaDto);
  }

  @Roles('ADMIN', 'REGISTRADOR')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.carpetasService.remove(+id);
  }
}
