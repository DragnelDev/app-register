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
import { NotasEntregaService } from './notas-entrega.service';
import type { NotasEntregaFilterDto } from './notas-entrega.service';
import { CreateNotasEntregaDto } from './dto/create-notas-entrega.dto';
import { UpdateNotasEntregaDto } from './dto/update-notas-entrega.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';

@ApiTags('actas-entrega')
@ApiBearerAuth()
@Controller('actas-entrega')
export class NotasEntregaController {
  constructor(private readonly notasEntregaService: NotasEntregaService) {}

  @Roles('ADMIN', 'REGISTRADOR')
  @Post()
  create(@Body() dto: CreateNotasEntregaDto, @CurrentUser() usuario: Usuario) {
    return this.notasEntregaService.create(dto, usuario);
  }

  @Get()
  findAll(@Query() query: NotasEntregaFilterDto) {
    return this.notasEntregaService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notasEntregaService.findOne(+id);
  }

  @Roles('ADMIN', 'REGISTRADOR')
  @Patch(':id')
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
