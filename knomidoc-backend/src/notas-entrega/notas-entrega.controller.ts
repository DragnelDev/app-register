import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { NotasEntregaService } from './notas-entrega.service';
import { CreateNotasEntregaDto } from './dto/create-notas-entrega.dto';
import { UpdateNotasEntregaDto } from './dto/update-notas-entrega.dto';

@Controller('notas-entrega')
export class NotasEntregaController {
  constructor(private readonly notasEntregaService: NotasEntregaService) {}

  @Post()
  create(@Body() createNotasEntregaDto: CreateNotasEntregaDto) {
    return this.notasEntregaService.create(createNotasEntregaDto);
  }

  @Get()
  findAll() {
    return this.notasEntregaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notasEntregaService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateNotasEntregaDto: UpdateNotasEntregaDto,
  ) {
    return this.notasEntregaService.update(+id, updateNotasEntregaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notasEntregaService.remove(+id);
  }
}
