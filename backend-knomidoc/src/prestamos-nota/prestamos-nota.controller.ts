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
} from '@nestjs/common';
import { PrestamosNotaService } from './prestamos-nota.service';
import { CreatePrestamosNotaDto } from './dto/create-prestamos-nota.dto';
import { UpdatePrestamosNotaDto } from './dto/update-prestamos-nota.dto';
import { DevolverPrestamosNotaDto } from './dto/devolver-prestamos-nota.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { FilterPrestamosNotaDto } from './dto/filter-prestamos-nota.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';

@ApiTags('prestamos-nota')
@ApiBearerAuth()
@Controller('prestamos-nota')
export class PrestamosNotaController {
  constructor(private readonly prestamosNotaService: PrestamosNotaService) {}

  @Roles('ADMIN', 'ENCARGADO_PRESTAMOS')
  @Post()
  create(@Body() dto: CreatePrestamosNotaDto, @CurrentUser() usuario: Usuario) {
    return this.prestamosNotaService.create(dto, usuario);
  }

  @Get()
  findAll(@Query() query: FilterPrestamosNotaDto) {
    return this.prestamosNotaService.findAll(query);
  }

  /** Nota de remisión en PDF (carta) lista para imprimir y firmar. */
  @Get('pdf')
  async pdf(
    @Query('numeroNota') numeroNota: string,
    @CurrentUser() usuario: Usuario,
  ) {
    const buffer = await this.prestamosNotaService.notaPdf(
      (numeroNota ?? '').trim(),
      usuario,
    );
    const archivo = `nota-prestamo-${(numeroNota ?? '').replace(/[^\w.-]+/g, '_')}.pdf`;
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `inline; filename="${archivo}"`,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.prestamosNotaService.findOne(id);
  }

  @Roles('ADMIN', 'ENCARGADO_PRESTAMOS')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePrestamosNotaDto: UpdatePrestamosNotaDto,
  ) {
    return this.prestamosNotaService.update(id, updatePrestamosNotaDto);
  }

  @Roles('ADMIN', 'ENCARGADO_PRESTAMOS')
  @Patch(':id/devolver')
  devolver(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DevolverPrestamosNotaDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.prestamosNotaService.devolver(id, dto, usuario);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.prestamosNotaService.remove(id);
  }
}
