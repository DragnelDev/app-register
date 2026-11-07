import { Controller, Get, Query, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportesService } from './reportes.service';
import { FilterReporteDto } from './dto/filter-reporte.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('reportes')
@ApiBearerAuth()
@Roles('ADMIN', 'OPERADOR_ARCHIVOS', 'CONSULTA_AVANZADA', 'CONSULTA_EXTERNA')
@Controller('reportes')
export class ReportesController {
  constructor(private readonly service: ReportesService) {}

  @Get('financiero')
  financiero(@Query() filtros: FilterReporteDto) {
    return this.service.financiero(filtros);
  }

  @Get('financiero/export')
  async exportar(@Query() filtros: FilterReporteDto) {
    const buffer = await this.service.exportarExcel(filtros);
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="reporte-financiero-${filtros.gestion ?? 'todas'}.xlsx"`,
    });
  }
}
