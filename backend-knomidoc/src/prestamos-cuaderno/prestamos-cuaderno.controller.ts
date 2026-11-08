import { ROLES_REPORTES } from '../common/constants/roles.constant';
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
  StreamableFile,
  UploadedFile,
  UseInterceptors,
  ParseEnumPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Express } from 'express';
import { PrestamosCuadernoService } from './prestamos-cuaderno.service';
import { CreatePrestamosCuadernoDto } from './dto/create-prestamos-cuaderno.dto';
import { UpdatePrestamosCuadernoDto } from './dto/update-prestamos-cuaderno.dto';
import { DevolverPrestamosCuadernoDto } from './dto/devolver-prestamos-cuaderno.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { FilterPrestamosCuadernoDto } from './dto/filter-prestamos-cuaderno.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';

@ApiTags('prestamos-cuaderno')
@ApiBearerAuth()
@Controller('prestamos-cuaderno')
export class PrestamosCuadernoController {
  constructor(
    private readonly prestamosCuadernoService: PrestamosCuadernoService,
  ) {}

  @Roles('ADMIN', 'ENCARGADO_PRESTAMOS')
  @Post()
  create(
    @Body() createPrestamosCuadernoDto: CreatePrestamosCuadernoDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.prestamosCuadernoService.create(
      createPrestamosCuadernoDto,
      usuario,
    );
  }

  @Get()
  findAll(@Query() query: FilterPrestamosCuadernoDto) {
    return this.prestamosCuadernoService.findAll(query);
  }

  /** Planilla PDF de préstamos por cuaderno con los mismos filtros del listado. */
  @Roles(...ROLES_REPORTES)
  @Get('reporte/pdf')
  async reportePdf(
    @Query() query: FilterPrestamosCuadernoDto,
    @CurrentUser() usuario: Usuario,
  ) {
    const buffer = await this.prestamosCuadernoService.reportePdf(
      query,
      usuario,
    );
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `inline; filename="prestamos-cuaderno-${new Date().toISOString().slice(0, 10)}.pdf"`,
    });
  }

  /** Devuelve todos los comprobantes que salieron juntos (lote), en un solo acto. */
  @Roles('ADMIN', 'ENCARGADO_PRESTAMOS')
  @Patch('lote/:loteId/devolver')
  devolverLote(
    @Param('loteId') loteId: string,
    @Body() dto: DevolverPrestamosCuadernoDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.prestamosCuadernoService.devolverLote(loteId, dto, usuario);
  }

  /** Sube o reemplaza la imagen de evidencia (salida o devolución) del lote del préstamo. */
  @Roles('ADMIN', 'ENCARGADO_PRESTAMOS')
  @Post(':id/evidencia/:momento')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  subirEvidencia(
    @Param('id', ParseIntPipe) id: number,
    @Param('momento', new ParseEnumPipe(['salida', 'devolucion']))
    momento: 'salida' | 'devolucion',
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.prestamosCuadernoService.subirEvidencia(id, momento, file);
  }

  @Get(':id/evidencia/:momento')
  async verEvidencia(
    @Param('id', ParseIntPipe) id: number,
    @Param('momento', new ParseEnumPipe(['salida', 'devolucion']))
    momento: 'salida' | 'devolucion',
  ) {
    const { stream, mime } = await this.prestamosCuadernoService.abrirEvidencia(
      id,
      momento,
    );
    return new StreamableFile(stream, { type: mime, disposition: 'inline' });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.prestamosCuadernoService.findOne(id);
  }

  @Roles('ADMIN', 'ENCARGADO_PRESTAMOS')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePrestamosCuadernoDto: UpdatePrestamosCuadernoDto,
  ) {
    return this.prestamosCuadernoService.update(id, updatePrestamosCuadernoDto);
  }

  @Roles('ADMIN', 'ENCARGADO_PRESTAMOS')
  @Patch(':id/devolver')
  devolver(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DevolverPrestamosCuadernoDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.prestamosCuadernoService.devolver(id, dto, usuario);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.prestamosCuadernoService.remove(id);
  }
}
