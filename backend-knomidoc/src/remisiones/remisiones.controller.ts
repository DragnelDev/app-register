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
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { remisionPdf, RemisionVista } from './remision-pdf.util';
import { RemisionesService } from './remisiones.service';
import {
  CreateRemisionDto,
  FilterRemisionesDto,
  RecibirRemisionDto,
  UpdateRemisionDto,
} from './dto/remision.dto';

@ApiTags('remisiones')
@ApiBearerAuth()
@Controller('remisiones')
export class RemisionesController {
  constructor(private readonly service: RemisionesService) {}

  @Roles('REMITENTE_C31', 'ADMIN', 'OPERADOR_ARCHIVOS')
  @Get('candidatos')
  candidatos(@Query('search') search?: string) {
    return this.service.candidatos(search);
  }

  @Roles('REMITENTE_C31', 'ADMIN', 'OPERADOR_ARCHIVOS')
  @Get()
  findAll(@Query() q: FilterRemisionesDto, @CurrentUser() u: Usuario) {
    return this.service.findAll(q, u);
  }

  /** Nota de remisión imprimible (firmas del remitente y de Archivo). */
  @Roles('REMITENTE_C31', 'ADMIN', 'OPERADOR_ARCHIVOS')
  @Get(':id/pdf')
  async pdf(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: Usuario) {
    const r = await this.service.findOne(id, u);
    const buffer = await remisionPdf(r as unknown as RemisionVista);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `inline; filename="${r.numeroRemision}.pdf"`,
    });
  }

  @Roles('REMITENTE_C31', 'ADMIN', 'OPERADOR_ARCHIVOS')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: Usuario) {
    return this.service.findOne(id, u);
  }

  @Roles('REMITENTE_C31')
  @Post()
  create(@Body() dto: CreateRemisionDto, @CurrentUser() u: Usuario) {
    return this.service.create(dto, u);
  }

  @Roles('REMITENTE_C31')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRemisionDto,
    @CurrentUser() u: Usuario,
  ) {
    return this.service.update(id, dto, u);
  }

  @Roles('REMITENTE_C31')
  @Post(':id/enviar')
  enviar(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: Usuario) {
    return this.service.enviar(id, u);
  }

  @Roles('REMITENTE_C31')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: Usuario) {
    return this.service.remove(id, u);
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS')
  @Post(':id/recibir')
  recibir(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RecibirRemisionDto,
    @CurrentUser() u: Usuario,
  ) {
    return this.service.recibir(id, dto, u);
  }
}
