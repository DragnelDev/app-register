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
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Express } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CitesService, MAX_ADJUNTO_BYTES } from './cites.service';
import {
  AnularCiteDto,
  CreateCiteDto,
  FiltroCiteDto,
  UpdateCiteDto,
} from './dto/cite.dto';

const LECTURA = [
  'ADMIN',
  'OPERADOR_ARCHIVOS',
  'AUXILIAR_ARCHIVOS',
  'ENCARGADO_PRESTAMOS',
  'CONSULTA_AVANZADA',
] as const;
const ESCRITURA = ['ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS'] as const;

@ApiTags('cites')
@ApiBearerAuth()
@Controller('cites')
export class CitesController {
  constructor(private readonly service: CitesService) {}

  @Roles(...LECTURA)
  @Get()
  findAll(@Query() f: FiltroCiteDto) {
    return this.service.findAll(f);
  }

  /** Planilla de control (N° CITE, Fecha, Serie, Destinatario, Referencia) con los filtros activos. */
  @Roles(...LECTURA)
  @Get('export')
  async exportar(@Query() f: FiltroCiteDto) {
    const buffer = await this.service.exportarPlanilla(f);
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="planilla-cites-${f.gestion ?? 'todas'}.xlsx"`,
    });
  }

  @Roles(...LECTURA)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles(...ESCRITURA)
  @Post()
  create(@Body() dto: CreateCiteDto, @CurrentUser() u: Usuario) {
    return this.service.create(dto, u);
  }

  @Roles(...ESCRITURA)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCiteDto) {
    return this.service.update(id, dto);
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS')
  @Patch(':id/anular')
  anular(@Param('id', ParseIntPipe) id: number, @Body() dto: AnularCiteDto) {
    return this.service.anular(id, dto);
  }

  @Roles(...ESCRITURA)
  @Post(':id/archivos')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_ADJUNTO_BYTES },
    }),
  )
  subir(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() u: Usuario,
  ) {
    return this.service.subir(id, files, u);
  }

  @Roles(...LECTURA)
  @Get(':id/archivos/:adjuntoId')
  async archivo(
    @Param('id', ParseIntPipe) id: number,
    @Param('adjuntoId', ParseIntPipe) adjuntoId: number,
    @Query('descargar') descargar?: string,
  ) {
    const { adjunto, stream } = await this.service.abrir(id, adjuntoId);
    return new StreamableFile(stream, {
      type: adjunto.mimeType,
      length: adjunto.tamano,
      disposition: `${descargar === '1' ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(adjunto.nombreOriginal as string)}`,
    });
  }

  @Roles(...ESCRITURA)
  @Delete(':id/archivos/:adjuntoId')
  async eliminar(
    @Param('id', ParseIntPipe) id: number,
    @Param('adjuntoId', ParseIntPipe) adjuntoId: number,
  ) {
    await this.service.eliminarAdjunto(id, adjuntoId);
    return { eliminado: true };
  }
}
