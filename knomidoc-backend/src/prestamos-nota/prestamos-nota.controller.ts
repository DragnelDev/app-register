import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PrestamosNotaService } from './prestamos-nota.service';
import { CreatePrestamosNotaDto } from './dto/create-prestamos-nota.dto';
import { UpdatePrestamosNotaDto } from './dto/update-prestamos-nota.dto';

@Controller('prestamos-nota')
export class PrestamosNotaController {
  constructor(private readonly prestamosNotaService: PrestamosNotaService) {}

  @Post()
  create(@Body() createPrestamosNotaDto: CreatePrestamosNotaDto) {
    return this.prestamosNotaService.create(createPrestamosNotaDto);
  }

  @Get()
  findAll() {
    return this.prestamosNotaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prestamosNotaService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePrestamosNotaDto: UpdatePrestamosNotaDto,
  ) {
    return this.prestamosNotaService.update(+id, updatePrestamosNotaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.prestamosNotaService.remove(+id);
  }
}
