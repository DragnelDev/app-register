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
import { AbiertoATodosLosPerfiles } from '../auth/decorators/abierto-a-todos.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { ROLES_REPORTES } from '../common/constants/roles.constant';
import { BeneficiariosService } from './beneficiarios.service';
import { CreateBeneficiarioDto } from './dto/create-beneficiario.dto';
import { UpdateBeneficiarioDto } from './dto/update-beneficiario.dto';
import { FilterBeneficiariosDto } from './dto/filter-beneficiarios.dto';
import { beneficiariosPdf } from './beneficiarios-pdf.util';

@ApiTags('beneficiarios')
@ApiBearerAuth()
@Controller('beneficiarios')
export class BeneficiariosController {
  constructor(private readonly service: BeneficiariosService) {}

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS')
  @Post()
  create(@Body() dto: CreateBeneficiarioDto, @CurrentUser() u: Usuario) {
    return this.service.create(dto, u.id);
  }

  /** ?search= (nombre o CI/NIT) + filtros. También sirve para el autocompletado. */
  /** Autocompletado del formulario de C31 (también para el remitente). */
  @AbiertoATodosLosPerfiles()
  @Get()
  findAll(@Query() query: FilterBeneficiariosDto) {
    return this.service.findAll(query);
  }

  /** PDF del listado con los mismos filtros de la búsqueda. */
  @Roles(...ROLES_REPORTES)
  @Get('reporte/pdf')
  async pdf(@Query() query: FilterBeneficiariosDto) {
    const { data } = await this.service.findAll({
      ...query,
      page: 1,
      pageSize: 1000,
    });
    const buffer = await beneficiariosPdf(data, query);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `inline; filename="beneficiarios-${new Date().toISOString().slice(0, 10)}.pdf"`,
    });
  }

  @Get(':id/ficha')
  ficha(@Param('id', ParseIntPipe) id: number) {
    return this.service.ficha(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBeneficiarioDto,
  ) {
    return this.service.update(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
