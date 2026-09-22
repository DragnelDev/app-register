import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActasEntregaService } from './actas-entrega.service';
import { FilterActasEntregaDto } from './dto/filter-actas-entrega.dto';
import { CreateActasEntregaDto } from './dto/create-actas-entrega.dto';
import { UpdateActasEntregaDto } from './dto/update-actas-entrega.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('actas-entrega')
@ApiBearerAuth()
@Controller('actas-entrega')
export class ActasEntregaController {
  constructor(private readonly actasEntregaService: ActasEntregaService) {}

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS')
  @Post()
  create(@Body() dto: CreateActasEntregaDto) {
    return this.actasEntregaService.create(dto);
  }

  @Get()
  findAll(@Query() query: FilterActasEntregaDto) {
    return this.actasEntregaService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.actasEntregaService.findOne(+id);
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateNotasEntregaDto: UpdateActasEntregaDto,
  ) {
    return this.actasEntregaService.update(+id, updateNotasEntregaDto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.actasEntregaService.remove(+id);
  }
}
