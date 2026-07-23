import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PrestamosNotaDetalleService } from './prestamos-nota-detalle.service';
import { CreatePrestamosNotaDetalleDto } from './dto/create-prestamos-nota-detalle.dto';
import { UpdatePrestamosNotaDetalleDto } from './dto/update-prestamos-nota-detalle.dto';

@Controller('prestamos-nota-detalle')
export class PrestamosNotaDetalleController {
  constructor(
    private readonly prestamosNotaDetalleService: PrestamosNotaDetalleService,
  ) {}

  @Post()
  create(@Body() createPrestamosNotaDetalleDto: CreatePrestamosNotaDetalleDto) {
    return this.prestamosNotaDetalleService.create(
      createPrestamosNotaDetalleDto,
    );
  }

  @Get()
  findAll() {
    return this.prestamosNotaDetalleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prestamosNotaDetalleService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePrestamosNotaDetalleDto: UpdatePrestamosNotaDetalleDto,
  ) {
    return this.prestamosNotaDetalleService.update(
      +id,
      updatePrestamosNotaDetalleDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.prestamosNotaDetalleService.remove(+id);
  }
}
