import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Express } from 'express';

@ApiTags('Uploads') // Categoría en la UI de Swagger
@Controller('uploads')
export class UploadsController {
  @Post()
  @ApiOperation({ summary: 'Subir una imagen al servidor' })
  @ApiConsumes('multipart/form-data') // 🔴 Le dice a Swagger que es un envío de formulario/archivo
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary', // 🔴 Renderiza el botón de subida de archivo en Swagger UI
          description: 'Archivo de imagen (máx 5MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Imagen subida exitosamente.',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          example: 'http://localhost:3000/uploads/1721680000000-123456789.png',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Archivo no enviado o formato no válido.',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname));
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          console.log('Archivo rechazado, no es imagen');
          return cb(
            new BadRequestException('Solo se permiten archivos de imagen'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    console.log('Archivo recibido en backend:', file);

    if (!file) {
      throw new BadRequestException('No se envió ningún archivo válido');
    }

    const base = process.env.API_BASE_URL || 'http://localhost:3000';
    const url = `${base}/uploads/${file.filename}`;
    console.log('URL generada:', url);

    return { url };
  }
}
