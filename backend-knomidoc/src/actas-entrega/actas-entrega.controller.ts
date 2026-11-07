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
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActasEntregaService } from './actas-entrega.service';
import { FilterActasEntregaDto } from './dto/filter-actas-entrega.dto';
import { CreateActasEntregaDto } from './dto/create-actas-entrega.dto';
import { UpdateActasEntregaDto } from './dto/update-actas-entrega.dto';
import { AbiertoATodosLosPerfiles } from '../auth/decorators/abierto-a-todos.decorator';
import { actaPdf } from './acta-pdf.util';
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

  /** Comprobantes firmados y sin acta que se pueden incluir (también para el remitente). */
  @Roles('ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS', 'REMITENTE_C31')
  @Get('candidatos')
  candidatos(@Query('search') search?: string) {
    return this.actasEntregaService.candidatos(search);
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS', 'REMITENTE_C31')
  @Post()
  create(@Body() dto: CreateActasEntregaDto, @CurrentUser() usuario: Usuario) {
    return this.actasEntregaService.create(dto, usuario);
  }

  // El remitente ve solo sus actas (lo asegura el servicio)
  @AbiertoATodosLosPerfiles()
  @Get()
  findAll(
    @Query() query: FilterActasEntregaDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.actasEntregaService.findAll(query, usuario);
  }

  /** Acta imprimible con firmas de quien entrega y de Archivo. */
  @AbiertoATodosLosPerfiles()
  @Get(':id/pdf')
  async pdf(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: Usuario,
  ) {
    const acta = await this.actasEntregaService.findOne(id, usuario);
    const buffer = await actaPdf(acta);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `inline; filename="${acta.numeroActa}.pdf"`,
    });
  }

  @AbiertoATodosLosPerfiles()
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.actasEntregaService.findOne(id, usuario);
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS', 'REMITENTE_C31')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActasEntregaDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.actasEntregaService.update(id, dto, usuario);
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

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS', 'REMITENTE_C31')
  @Patch(':id/anular')
  anular(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.actasEntregaService.anular(id, usuario);
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS', 'REMITENTE_C31')
  @Post(':id/comprobantes')
  agregarComprobantes(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ComprobantesActaDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.actasEntregaService.agregarComprobantes(
      id,
      dto.comprobanteIds as number[],
      usuario,
    );
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS', 'REMITENTE_C31')
  @Delete(':id/comprobantes/:comprobanteId')
  quitarComprobante(
    @Param('id', ParseIntPipe) id: number,
    @Param('comprobanteId', ParseIntPipe) comprobanteId: number,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.actasEntregaService.quitarComprobante(
      id,
      comprobanteId,
      usuario,
    );
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.actasEntregaService.remove(+id);
  }
}
