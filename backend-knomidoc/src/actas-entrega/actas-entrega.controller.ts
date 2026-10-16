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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActasEntregaService } from './actas-entrega.service';
import { FilterActasEntregaDto } from './dto/filter-actas-entrega.dto';
import { CreateActasEntregaDto } from './dto/create-actas-entrega.dto';
import { UpdateActasEntregaDto } from './dto/update-actas-entrega.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AprobarActasEntregaDto,
  ComprobantesActaDto,
} from './dto/aprobar-actas-entrega.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';

@ApiTags('actas-entrega')
@ApiBearerAuth()
@Controller('actas-entrega')
export class ActasEntregaController {
  constructor(private readonly actasEntregaService: ActasEntregaService) {}

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS')
  @Post()
  create(@Body() dto: CreateActasEntregaDto) {
    return this.actasEntregaService.create(dto);
  }

  @Get()
  findAll(@Query() query: FilterActasEntregaDto) {
    return this.actasEntregaService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.actasEntregaService.findOne(+id);
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateNotasEntregaDto: UpdateActasEntregaDto,
  ) {
    return this.actasEntregaService.update(+id, updateNotasEntregaDto);
  }

  /** El archivista aprueba la recepción y actualiza el estado de cada comprobante. */
  @Roles('ADMIN', 'OPERADOR_ARCHIVOS')
  @Patch(':id/aprobar')
  aprobar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AprobarActasEntregaDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.actasEntregaService.aprobar(id, dto, usuario);
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS')
  @Patch(':id/anular')
  anular(@Param('id', ParseIntPipe) id: number) {
    return this.actasEntregaService.anular(id);
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS')
  @Post(':id/comprobantes')
  agregarComprobantes(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ComprobantesActaDto,
  ) {
    return this.actasEntregaService.agregarComprobantes(
      id,
      dto.comprobanteIds as number[],
    );
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS')
  @Delete(':id/comprobantes/:comprobanteId')
  quitarComprobante(
    @Param('id', ParseIntPipe) id: number,
    @Param('comprobanteId', ParseIntPipe) comprobanteId: number,
  ) {
    return this.actasEntregaService.quitarComprobante(id, comprobanteId);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.actasEntregaService.remove(+id);
  }
}
