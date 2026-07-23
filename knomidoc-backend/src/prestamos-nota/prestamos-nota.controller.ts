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
import { PrestamosNotaService } from './prestamos-nota.service';
import { CreatePrestamosNotaDto } from './dto/create-prestamos-nota.dto';
import { UpdatePrestamosNotaDto } from './dto/update-prestamos-nota.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { FilterPrestamosNotaDto } from './dto/filter-prestamos-nota.dto';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('prestamos-nota')
@ApiBearerAuth()
@Controller('prestamos-nota')
export class PrestamosNotaController {
  constructor(private readonly prestamosNotaService: PrestamosNotaService) {}

  @Roles('ADMIN', 'REGISTRADOR')
  @Post()
  create(@Body() dto: CreatePrestamosNotaDto, @CurrentUser() usuario: Usuario) {
    return this.prestamosNotaService.create(dto, usuario); // Pasa 'usuario'
  }

  @Get()
  findAll(@Query() query: FilterPrestamosNotaDto) {
    return this.prestamosNotaService.findAll(query); // Pasa 'query'
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prestamosNotaService.findOne(+id);
  }

  @Roles('ADMIN', 'REGISTRADOR')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePrestamosNotaDto: UpdatePrestamosNotaDto,
  ) {
    return this.prestamosNotaService.update(+id, updatePrestamosNotaDto);
  }

  @Roles('ADMIN', 'REGISTRADOR')
  @Patch(':id/detalle/:detalleId/devolver')
  devolverItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('detalleId', ParseIntPipe) detalleId: number,
  ) {
    return this.prestamosNotaService.devolverItem(id, detalleId);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.prestamosNotaService.remove(+id);
  }
}
