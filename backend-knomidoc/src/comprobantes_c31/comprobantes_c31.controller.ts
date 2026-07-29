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
import { ComprobantesC31Service } from './comprobantes_c31.service';
import { CreateComprobantesC31Dto } from './dto/create-comprobantes_c31.dto';
import { UpdateComprobantesC31Dto } from './dto/update-comprobantes_c31.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { FilterComprobantesC31Dto } from './dto/filter-comprobantes_c31.dto';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('comprobantes-c31')
@ApiBearerAuth()
@Controller('comprobantes-c31')
export class ComprobantesC31Controller {
  constructor(
    private readonly comprobantesC31Service: ComprobantesC31Service,
  ) {}

  @Roles('ADMIN', 'REGISTRADOR')
  @Post()
  create(
    @Body() dto: CreateComprobantesC31Dto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.comprobantesC31Service.create(dto, usuario); // Pasa 'usuario'
  }

  @Get()
  findAll(@Query() query: FilterComprobantesC31Dto) {
    return this.comprobantesC31Service.findAll(query); // Pasa 'query'
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.comprobantesC31Service.findOne(+id);
  }

  @Roles('ADMIN', 'REGISTRADOR')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateComprobantesC31Dto: UpdateComprobantesC31Dto,
  ) {
    return this.comprobantesC31Service.update(+id, updateComprobantesC31Dto);
  }

  @Roles('ADMIN', 'REGISTRADOR')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.comprobantesC31Service.remove(+id);
  }
}
