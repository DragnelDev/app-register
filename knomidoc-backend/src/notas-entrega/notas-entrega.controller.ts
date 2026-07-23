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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Express } from 'express';
import { NotasEntregaService } from './notas-entrega.service';
import type { NotasEntregaFilterDto } from './notas-entrega.service';
import { CreateNotasEntregaDto } from './dto/create-notas-entrega.dto';
import { UpdateNotasEntregaDto } from './dto/update-notas-entrega.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';

const imagenInterceptorOptions = {
  storage: diskStorage({
    destination: './uploads',
    filename: (_req: any, file: Express.Multer.File, cb: any) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, unique + extname(file.originalname));
    },
  }),
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(
        new BadRequestException('Solo se permiten archivos de imagen'),
        false,
      );
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB, según ERS
};

function buildImagenUrl(file?: Express.Multer.File): string | undefined {
  if (!file) return undefined;
  const base = process.env.API_BASE_URL || 'http://localhost:3000';
  return `${base}/uploads/${file.filename}`;
}

@ApiTags('notas-entrega')
@ApiBearerAuth()
@Controller('notas-entrega')
export class NotasEntregaController {
  constructor(private readonly notasEntregaService: NotasEntregaService) {}

  @Roles('ADMIN', 'REGISTRADOR')
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('imagen', imagenInterceptorOptions))
  create(@Body() dto: CreateNotasEntregaDto, @CurrentUser() usuario: Usuario) {
    return this.notasEntregaService.create(dto, usuario); // Pasa 'usuario'
  }

  @Get()
  findAll(@Query() query: NotasEntregaFilterDto) {
    return this.notasEntregaService.findAll(query); // Pasa 'query'
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notasEntregaService.findOne(+id);
  }

  @Roles('ADMIN', 'REGISTRADOR')
  @Patch(':id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('imagen', imagenInterceptorOptions))
  update(
    @Param('id') id: string,
    @Body() updateNotasEntregaDto: UpdateNotasEntregaDto,
  ) {
    return this.notasEntregaService.update(+id, updateNotasEntregaDto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notasEntregaService.remove(+id);
  }
}
