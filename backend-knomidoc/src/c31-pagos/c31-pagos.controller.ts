import { ROLES_REPORTES } from '../common/constants/roles.constant';
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
import { C31PagosService } from './c31-pagos.service';
import { CreateC31PagoDto } from './dto/create-c31-pago.dto';
import { UpdateC31PagoDto } from './dto/update-c31-pago.dto';
import { FilterC31PagoDto } from './dto/filter-c31-pago.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('pagos')
@ApiBearerAuth()
@Controller('pagos')
export class C31PagosController {
  constructor(private readonly service: C31PagosService) {}

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS')
  @Post()
  create(@Body() dto: CreateC31PagoDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: FilterC31PagoDto) {
    return this.service.findAll(query);
  }

  // Rutas fijas antes de ':id'
  @Get('resumen')
  resumen(@Query() query: FilterC31PagoDto) {
    return this.service.resumen(query);
  }

  @Get('beneficiarios')
  porBeneficiario(@Query() query: FilterC31PagoDto) {
    return this.service.porBeneficiario(query);
  }

  @Get('comprobante/:comprobanteId')
  porComprobante(@Param('comprobanteId', ParseIntPipe) comprobanteId: number) {
    return this.service.porComprobante(comprobanteId);
  }

  @Roles(...ROLES_REPORTES)
  @Get('export')
  async exportExcel(@Query() query: FilterC31PagoDto) {
    const buffer = await this.service.exportExcel(query);
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: 'attachment; filename="pagos-c31.xlsx"',
    });
  }

  @Roles(...ROLES_REPORTES)
  @Get('pdf')
  async listadoPdf(@Query() query: FilterC31PagoDto) {
    const buffer = await this.service.listadoPdf(query);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: 'inline; filename="listado-pagos-c31.pdf"',
    });
  }

  @Get(':id/pdf')
  async constanciaPdf(@Param('id', ParseIntPipe) id: number) {
    const buffer = await this.service.constanciaPdf(id);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `inline; filename="constancia-pago-${id}.pdf"`,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateC31PagoDto) {
    return this.service.update(id, dto);
  }

  @Roles('ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
