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
import { NotasAuditoriaService } from './notas-auditoria.service';
import {
  SolicitudAuditoriaDto,
  UpdateSolicitudAuditoriaDto,
} from './dto/nota-auditoria.dto';
import {
  ClasificarDto,
  CreateNotaAuditoriaDto,
  UpdateNotaAuditoriaDto,
} from './dto/nota-auditoria.dto';

const LECTURA = [
  'ADMIN',
  'OPERADOR_ARCHIVOS',
  'AUXILIAR_ARCHIVOS',
  'ENCARGADO_PRESTAMOS',
  'CONSULTA_AVANZADA',
] as const;
// Archivo y Préstamos preparan la respuesta (el encargado de préstamos conoce las notas)
const ESCRITURA = [
  'ADMIN',
  'OPERADOR_ARCHIVOS',
  'ENCARGADO_PRESTAMOS',
] as const;

@ApiTags('notas-auditoria')
@ApiBearerAuth()
@Controller('notas-auditoria')
export class NotasAuditoriaController {
  constructor(private readonly service: NotasAuditoriaService) {}

  @Roles(...LECTURA)
  @Get()
  findAll(@Query('search') search?: string) {
    return this.service.findAll(search);
  }

  // ── Solicitudes de Auditoría (antes de ':id' para que no choquen las rutas) ──
  @Roles(...LECTURA)
  @Get('solicitudes')
  solicitudes(
    @Query('estado') estado?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listarSolicitudes(estado, search);
  }

  @Roles(...ESCRITURA)
  @Post('solicitudes')
  crearSolicitud(
    @Body() dto: SolicitudAuditoriaDto,
    @CurrentUser() u: Usuario,
  ) {
    return this.service.crearSolicitud(dto, u);
  }

  @Roles('ADMIN')
  @Post('solicitudes/ejemplo')
  solicitudesEjemplo(
    @Query('gestion') gestion: string | undefined,
    @CurrentUser() u: Usuario,
  ) {
    return this.service.solicitudesEjemplo(
      Number(gestion) || new Date().getFullYear(),
      u,
    );
  }

  @Roles(...LECTURA)
  @Get('solicitudes/:id')
  solicitud(@Param('id', ParseIntPipe) id: number) {
    return this.service.solicitud(id);
  }

  @Roles(...ESCRITURA)
  @Patch('solicitudes/:id')
  actualizarSolicitud(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSolicitudAuditoriaDto,
  ) {
    return this.service.actualizarSolicitud(id, dto);
  }

  @Roles(...ESCRITURA)
  @Delete('solicitudes/:id')
  eliminarSolicitud(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminarSolicitud(id);
  }

  @Roles(...LECTURA)
  @Get('notas-prestamo')
  notasPrestamo(@Query('search') search?: string) {
    return this.service.notasPrestamo(search);
  }

  @Roles(...LECTURA)
  @Get('desde-prestamos')
  desdePrestamos(@Query('notas') notas: string) {
    return this.service.desdePrestamos(
      (notas ?? '')
        .split('|')
        .map((n) => n.trim())
        .filter(Boolean),
    );
  }

  @Roles(...LECTURA)
  @Post('clasificar')
  clasificar(@Body() dto: ClasificarDto) {
    return this.service.clasificar(dto);
  }

  @Roles(...ESCRITURA)
  @Patch(':id/emitir')
  emitir(@Param('id', ParseIntPipe) id: number) {
    return this.service.emitir(id);
  }

  @Roles(...LECTURA)
  @Get(':id/pdf')
  async pdf(@Param('id', ParseIntPipe) id: number) {
    const buf = await this.service.pdf(id);
    return new StreamableFile(buf, {
      type: 'application/pdf',
      disposition: `inline; filename="nota-auditoria-${id}.pdf"`,
    });
  }

  @Roles(...LECTURA)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles(...ESCRITURA)
  @Post()
  create(@Body() dto: CreateNotaAuditoriaDto, @CurrentUser() u: Usuario) {
    return this.service.create(dto, u);
  }

  @Roles(...ESCRITURA)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNotaAuditoriaDto,
    @CurrentUser() u: Usuario,
  ) {
    return this.service.update(id, dto, u);
  }

  @Roles(...ESCRITURA)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: Usuario) {
    return this.service.remove(id, u);
  }
}
