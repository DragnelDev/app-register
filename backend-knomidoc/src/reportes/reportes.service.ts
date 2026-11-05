import { Injectable } from '@nestjs/common';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { ComprobantesC31 } from '../comprobantes_c31/entities/comprobantes_c31.entity';
import { FilterReporteDto } from './dto/filter-reporte.dto';

export interface FilaAgrupada {
  cantidad: number;
  monto: number;
}

export interface ReporteFinanciero {
  filtros: FilterReporteDto;
  /** Los totales NO incluyen comprobantes anulados (se informan aparte). */
  totales: FilaAgrupada & { promedio: number };
  anulados: FilaAgrupada;
  porTipo: (FilaAgrupada & { tipo: string })[];
  porEstado: (FilaAgrupada & { estado: string })[];
  porMes: (FilaAgrupada & { mes: number })[];
  porGestion: (FilaAgrupada & { gestion: number })[];
  topBeneficiarios: (FilaAgrupada & { nombre: string })[];
}

const num = (v: unknown): number => Number(v ?? 0);

@Injectable()
export class ReportesService {
  constructor(private readonly dataSource: DataSource) {}

  /** Consulta base con los filtros del reporte (sin soft-deleted). */
  private base(filtros: FilterReporteDto): SelectQueryBuilder<ComprobantesC31> {
    const qb = this.dataSource
      .getRepository(ComprobantesC31)
      .createQueryBuilder('c');
    if (filtros.gestion) qb.andWhere('c.gestion = :g', { g: filtros.gestion });
    if (filtros.tipoC31) qb.andWhere('c.tipo_c31 = :t', { t: filtros.tipoC31 });
    if (filtros.fechaDesde)
      qb.andWhere('c.fecha_elaboracion >= :fd', { fd: filtros.fechaDesde });
    if (filtros.fechaHasta)
      qb.andWhere('c.fecha_elaboracion <= :fh', { fh: filtros.fechaHasta });
    return qb;
  }

  async financiero(filtros: FilterReporteDto): Promise<ReporteFinanciero> {
    const agregados = (qb: SelectQueryBuilder<ComprobantesC31>) =>
      qb
        .addSelect('COUNT(*)', 'cantidad')
        .addSelect('COALESCE(SUM(c.monto_total), 0)', 'monto');

    const [vigentes, anulados, porTipo, porEstado, porMes, porGestion, top] =
      await Promise.all([
        agregados(this.base(filtros).select('1', 'x'))
          .andWhere("c.estado_fisico <> 'ANULADO'")
          .getRawOne<{ cantidad: string; monto: string }>(),
        agregados(this.base(filtros).select('1', 'x'))
          .andWhere("c.estado_fisico = 'ANULADO'")
          .getRawOne<{ cantidad: string; monto: string }>(),
        agregados(this.base(filtros).select('c.tipo_c31', 'tipo'))
          .andWhere("c.estado_fisico <> 'ANULADO'")
          .groupBy('c.tipo_c31')
          .orderBy('c.tipo_c31')
          .getRawMany<{ tipo: string; cantidad: string; monto: string }>(),
        agregados(this.base(filtros).select('c.estado_fisico', 'estado'))
          .groupBy('c.estado_fisico')
          .orderBy('c.estado_fisico')
          .getRawMany<{ estado: string; cantidad: string; monto: string }>(),
        agregados(
          this.base(filtros).select(
            'EXTRACT(MONTH FROM c.fecha_elaboracion)',
            'mes',
          ),
        )
          .andWhere("c.estado_fisico <> 'ANULADO'")
          .groupBy('mes')
          .orderBy('mes')
          .getRawMany<{ mes: string; cantidad: string; monto: string }>(),
        // Comparativo entre gestiones: ignora el filtro de gestión a propósito
        agregados(
          this.base({ ...filtros, gestion: undefined }).select(
            'c.gestion',
            'gestion',
          ),
        )
          .andWhere("c.estado_fisico <> 'ANULADO'")
          .groupBy('c.gestion')
          .orderBy('c.gestion', 'DESC')
          .getRawMany<{ gestion: string; cantidad: string; monto: string }>(),
        this.base(filtros)
          .innerJoin('c31_beneficiarios', 'b', 'b.comprobante_id = c.id')
          .select('UPPER(TRIM(b.nombre_beneficiario))', 'nombre')
          .addSelect('COUNT(DISTINCT c.id)', 'cantidad')
          .addSelect('COALESCE(SUM(c.monto_total), 0)', 'monto')
          .andWhere("c.estado_fisico <> 'ANULADO'")
          .groupBy('UPPER(TRIM(b.nombre_beneficiario))')
          .orderBy('monto', 'DESC')
          .limit(10)
          .getRawMany<{ nombre: string; cantidad: string; monto: string }>(),
      ]);

    const cantidad = num(vigentes?.cantidad);
    const monto = num(vigentes?.monto);

    return {
      filtros,
      totales: {
        cantidad,
        monto,
        promedio: cantidad > 0 ? Math.round((monto / cantidad) * 100) / 100 : 0,
      },
      anulados: {
        cantidad: num(anulados?.cantidad),
        monto: num(anulados?.monto),
      },
      porTipo: porTipo.map((f) => ({
        tipo: f.tipo,
        cantidad: num(f.cantidad),
        monto: num(f.monto),
      })),
      porEstado: porEstado.map((f) => ({
        estado: f.estado,
        cantidad: num(f.cantidad),
        monto: num(f.monto),
      })),
      porMes: porMes.map((f) => ({
        mes: num(f.mes),
        cantidad: num(f.cantidad),
        monto: num(f.monto),
      })),
      porGestion: porGestion.map((f) => ({
        gestion: num(f.gestion),
        cantidad: num(f.cantidad),
        monto: num(f.monto),
      })),
      topBeneficiarios: top.map((f) => ({
        nombre: f.nombre,
        cantidad: num(f.cantidad),
        monto: num(f.monto),
      })),
    };
  }

  async exportarExcel(filtros: FilterReporteDto): Promise<Buffer> {
    const r = await this.financiero(filtros);
    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    const wb = new ExcelJS.Workbook();
    const encabezado = (hoja: ExcelJS.Worksheet) => {
      hoja.getRow(1).font = { bold: true };
      hoja.getRow(1).alignment = { horizontal: 'center' };
    };

    const resumen = wb.addWorksheet('Resumen');
    resumen.columns = [
      { header: 'Concepto', key: 'c', width: 34 },
      { header: 'Cantidad', key: 'n', width: 14 },
      { header: 'Monto (Bs)', key: 'm', width: 18 },
    ];
    encabezado(resumen);
    resumen.addRow({
      c: 'Total vigente (sin anulados)',
      n: r.totales.cantidad,
      m: r.totales.monto,
    });
    resumen.addRow({
      c: 'Promedio por comprobante',
      n: '',
      m: r.totales.promedio,
    });
    resumen.addRow({
      c: 'Anulados',
      n: r.anulados.cantidad,
      m: r.anulados.monto,
    });
    resumen.addRow({});
    r.porTipo.forEach((t) =>
      resumen.addRow({
        c: t.tipo === 'CON_IMPUTACION' ? 'Con imputación' : 'Sin imputación',
        n: t.cantidad,
        m: t.monto,
      }),
    );

    const hojaMes = wb.addWorksheet('Por mes');
    hojaMes.columns = [
      { header: 'Mes', key: 'mes', width: 16 },
      { header: 'Cantidad', key: 'n', width: 14 },
      { header: 'Monto (Bs)', key: 'm', width: 18 },
    ];
    encabezado(hojaMes);
    r.porMes.forEach((f) =>
      hojaMes.addRow({
        mes: meses[f.mes - 1] ?? f.mes,
        n: f.cantidad,
        m: f.monto,
      }),
    );

    const hojaGestion = wb.addWorksheet('Por gestión');
    hojaGestion.columns = [
      { header: 'Gestión', key: 'g', width: 12 },
      { header: 'Cantidad', key: 'n', width: 14 },
      { header: 'Monto (Bs)', key: 'm', width: 18 },
    ];
    encabezado(hojaGestion);
    r.porGestion.forEach((f) =>
      hojaGestion.addRow({ g: f.gestion, n: f.cantidad, m: f.monto }),
    );

    const hojaBen = wb.addWorksheet('Beneficiarios');
    hojaBen.columns = [
      { header: 'Beneficiario', key: 'b', width: 44 },
      { header: 'Comprobantes', key: 'n', width: 16 },
      { header: 'Monto asociado (Bs)', key: 'm', width: 22 },
    ];
    encabezado(hojaBen);
    r.topBeneficiarios.forEach((f) =>
      hojaBen.addRow({ b: f.nombre, n: f.cantidad, m: f.monto }),
    );

    [resumen, hojaMes, hojaGestion, hojaBen].forEach(
      (h) => (h.getColumn('m').numFmt = '#,##0.00'),
    );

    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
