import {
  BadRequestException,
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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Express } from 'express';
import { ComprobantesC31Service } from './comprobantes_c31.service';
import { CreateComprobantesC31Dto } from './dto/create-comprobantes_c31.dto';
import { UpdateComprobantesC31Dto } from './dto/update-comprobantes_c31.dto';
import { FilterComprobantesC31Dto } from './dto/filter-comprobantes_c31.dto';
import { UnirComprobantesC31Dto } from './dto/unir-comprobantes_c31.dto';
import { CambiarEstadoC31Dto } from './dto/cambiar-estado-comprobantes_c31.dto';
import { C31SeguimientoService } from './c31-seguimiento.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('comprobantes-c31')
@ApiBearerAuth()
@Controller('comprobantes-c31')
export class ComprobantesC31Controller {
  constructor(
    private readonly comprobantesC31Service: ComprobantesC31Service,
    private readonly seguimientoService: C31SeguimientoService,
  ) {}

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS')
  @Post()
  create(
    @Body() dto: CreateComprobantesC31Dto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.comprobantesC31Service.create(dto, usuario);
  }

  /** Une comprobantes que vienen como uno solo (PREV + PREV, PREV + DEV). */
  @Roles('ADMIN', 'OPERADOR_ARCHIVOS')
  @Post('unir')
  unir(@Body() dto: UnirComprobantesC31Dto) {
    return this.comprobantesC31Service.unir(dto.comprobanteIds);
  }

  @Get()
  findAll(@Query() query: FilterComprobantesC31Dto) {
    return this.comprobantesC31Service.findAll(query);
  }

  // Las rutas fijas van antes de ':id' para que no se interpreten como un id
  @Get('gestiones')
  findGestiones() {
    return this.comprobantesC31Service.findGestiones();
  }

  @Get('export')
  async exportExcel(@Query('gestion') gestion?: string) {
    const buffer = await this.comprobantesC31Service.exportExcel(
      gestion ? Number(gestion) : undefined,
    );
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="comprobantes-c31-gestion-${gestion || 'todas'}.xlsx"`,
    });
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS')
  @Post('import')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  importExcel(
    @UploadedFile() file: Express.Multer.File,
    @Body('gestion') gestion: string,
    @CurrentUser() usuario: Usuario,
  ) {
    if (!file) throw new BadRequestException('No se envió ningún archivo');
    const anio = Number(gestion);
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
      throw new BadRequestException('La gestión indicada no es válida');
    }
    return this.comprobantesC31Service.importExcel(file.buffer, anio, usuario);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.comprobantesC31Service.findOne(id);
  }

  @Get(':id/grupo')
  grupo(@Param('id', ParseIntPipe) id: number) {
    return this.comprobantesC31Service.grupoDe(id);
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS')
  @Delete(':id/grupo')
  separar(@Param('id', ParseIntPipe) id: number) {
    return this.comprobantesC31Service.separar(id);
  }

  /** Bitácora de estados y detalle de préstamos del comprobante. */
  @Get(':id/seguimiento')
  seguimiento(@Param('id', ParseIntPipe) id: number) {
    return this.seguimientoService.obtener(id);
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS')
  @Patch(':id/estado')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoC31Dto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.comprobantesC31Service.cambiarEstado(id, dto, usuario);
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateComprobantesC31Dto: UpdateComprobantesC31Dto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.comprobantesC31Service.update(
      id,
      updateComprobantesC31Dto,
      usuario,
    );
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.comprobantesC31Service.remove(id);
  }
}
