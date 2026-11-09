import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Express } from 'express';
import { IsIn, IsOptional } from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';
import {
  C31AdjuntosService,
  MAX_ADJUNTO_BYTES,
  MAX_IMAGEN_BYTES,
  MAX_IMAGENES_DIGITALIZACION,
} from './c31-adjuntos.service';
import {
  TIPOS_ADJUNTO_C31,
  TipoAdjuntoC31,
} from './entities/c31-adjunto.entity';

class SubirAdjuntoDto {
  @IsOptional()
  @IsIn(TIPOS_ADJUNTO_C31)
  tipo?: TipoAdjuntoC31;
}

/**
 * Escaneos del C31 y sus respaldos. Se guardan en una carpeta privada y se
 * sirven solo con sesión válida (JWT), a diferencia de las imágenes públicas
 * de POST /uploads.
 */
@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads/c31/:comprobanteId')
export class C31AdjuntosController {
  constructor(private readonly service: C31AdjuntosService) {}

  @Get()
  listar(@Param('comprobanteId', ParseIntPipe) comprobanteId: number) {
    return this.service.listar(comprobanteId);
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS')
  @Post()
  @ApiOperation({ summary: 'Subir el PDF/imagen escaneado de un C31' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        tipo: { type: 'string', enum: TIPOS_ADJUNTO_C31, default: 'C31' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_ADJUNTO_BYTES },
    }),
  )
  subir(
    @Param('comprobanteId', ParseIntPipe) comprobanteId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: SubirAdjuntoDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.subir(
      comprobanteId,
      file,
      dto.tipo ?? TipoAdjuntoC31.C31,
      usuario,
    );
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS')
  @Post('digitalizar')
  @ApiOperation({
    summary:
      'Digitalización rápida: une varias imágenes (en orden) en un PDF y lo adjunta',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files'],
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
        tipo: { type: 'string', enum: TIPOS_ADJUNTO_C31, default: 'C31' },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', MAX_IMAGENES_DIGITALIZACION, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGEN_BYTES },
    }),
  )
  digitalizar(
    @Param('comprobanteId', ParseIntPipe) comprobanteId: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: SubirAdjuntoDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.service.digitalizar(
      comprobanteId,
      files,
      dto.tipo ?? TipoAdjuntoC31.C31,
      usuario,
    );
  }

  /** ?descargar=1 fuerza la descarga; por defecto se muestra en línea (vista previa). */
  @Get(':adjuntoId/archivo')
  async archivo(
    @Param('comprobanteId', ParseIntPipe) comprobanteId: number,
    @Param('adjuntoId', ParseIntPipe) adjuntoId: number,
    @Query('descargar') descargar?: string,
  ) {
    const { adjunto, stream } = await this.service.abrir(
      comprobanteId,
      adjuntoId,
    );
    const nombre = encodeURIComponent(adjunto.nombreOriginal as string);
    return new StreamableFile(stream, {
      type: adjunto.mimeType,
      length: adjunto.tamano,
      disposition: `${descargar === '1' ? 'attachment' : 'inline'}; filename*=UTF-8''${nombre}`,
    });
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS')
  @Delete(':adjuntoId')
  async eliminar(
    @Param('comprobanteId', ParseIntPipe) comprobanteId: number,
    @Param('adjuntoId', ParseIntPipe) adjuntoId: number,
  ) {
    await this.service.eliminar(comprobanteId, adjuntoId);
    return { eliminado: true };
  }
}
