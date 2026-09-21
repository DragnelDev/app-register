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
import { ActasEntregaService as ActasEntregaService } from './actas-entrega.service';
import type { ActasEntregaFilterDto } from './actas-entrega.service';
import { CreateActasEntregaDto } from './dto/create-actas-entrega.dto';
import { UpdateActasEntregaDto } from './dto/update-actas-entrega.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';

@ApiTags('actas-entrega')
@ApiBearerAuth()
@Controller('actas-entrega')
export class ActasEntregaController {
  constructor(private readonly actasEntregaService: ActasEntregaService) {}

  @Roles('ADMIN', 'REGISTRADOR')
  @Post()
  create(@Body() dto: CreateActasEntregaDto, @CurrentUser() usuario: Usuario) {
    return this.actasEntregaService.create(dto, usuario);
  }

  @Get()
  findAll(@Query() query: ActasEntregaFilterDto) {
    return this.actasEntregaService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.actasEntregaService.findOne(+id);
  }

  @Roles('ADMIN', 'REGISTRADOR')
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
