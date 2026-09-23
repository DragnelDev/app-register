import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  EntityManager,
  FindOptionsWhere,
  Like,
  Repository,
} from 'typeorm';
import * as ExcelJS from 'exceljs';
import {
  ComprobantesC31,
  EstadoFisicoC31,
  TipoC31,
  UBICACION_ARCHIVO_DEFAULT,
} from './entities/comprobantes_c31.entity';
import { CreateComprobantesC31Dto } from './dto/create-comprobantes_c31.dto';
import { UpdateComprobantesC31Dto } from './dto/update-comprobantes_c31.dto';
import { FilterComprobantesC31Dto } from './dto/filter-comprobantes_c31.dto';
import { C31Preventivo } from '../c31-preventivos/entities/c31-preventivo.entity';
import { C31Devengado } from '../c31-devengados/entities/c31-devengado.entity';
import { C31Beneficiario } from '../c31-beneficiarios/entities/c31-beneficiario.entity';
import { C31Cheque } from '../c31-cheques/entities/c31-cheque.entity';
import { ActasEntrega } from '../actas-entrega/entities/actas-entrega.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { paginationSkip } from '../common/utils/pagination.util';
import { Usuario } from '../usuarios/entities/usuario.entity';

const RELATIONS = {
  actaEntrega: true,
  creadoPor: true,
  preventivos: true,
  devengados: true,
  beneficiarios: true,
  cheques: true,
};

/** Quita espacios y descarta los valores vacíos de una lista de textos. */
function limpiarLista(valores?: string[]): string[] {
  return (valores ?? []).map((v) => String(v).trim()).filter(Boolean);
}

/** Texto de una celda de Excel (soporta texto enriquecido, fórmulas y fechas). */
function textoDeCelda(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if (typeof valor === 'object') {
    const v = valor as {
      text?: string;
      result?: unknown;
      richText?: { text: string }[];
    };
    if (Array.isArray(v.richText))
      return v.richText.map((t) => t.text).join('');
    if (v.text !== undefined) return String(v.text);
    if (
      typeof v.result === 'string' ||
      typeof v.result === 'number' ||
      typeof v.result === 'boolean'
    )
      return String(v.result);
    return '';
  }
  return typeof valor === 'string' || typeof valor === 'number'
    ? String(valor).trim()
    : '';
}

@Injectable()
export class ComprobantesC31Service {
  constructor(
    @InjectRepository(ComprobantesC31)
    private readonly repo: Repository<ComprobantesC31>,
    private readonly dataSource: DataSource,
  ) {}

  /** Debe existir al menos un N° de preventivo o de devengado (no ambos obligatorios). */
  private validarPreventivoODevengado(
    preventivos: string[],
    devengados: string[],
  ) {
    if (preventivos.length === 0 && devengados.length === 0) {
      throw new BadRequestException(
        'Debe registrar al menos un N° de preventivo o de devengado',
      );
    }
  }

  /**
   * Resuelve el estado físico y la ubicación con la que nace un comprobante:
   *  - Si se registra ya vinculado a un acta de entrega, se considera
   *    entregado/archivado: queda "En archivo" en "ARCHIVOS GAMSL" de forma
   *    automática (sin importar lo que venga en el DTO).
   *  - Si se registra suelto (sin acta), queda en el estado que indique el
   *    usuario, o "En Trámite / Revisión" por defecto; la ubicación física
   *    queda vacía hasta que se archive.
   */
  private resolverEstadoAlCrear(dto: CreateComprobantesC31Dto): {
    estadoFisico: EstadoFisicoC31;
    ubicacionFisica?: string | null;
  } {
    if (dto.actaEntregaId) {
      return {
        estadoFisico: EstadoFisicoC31.EN_ARCHIVO,
        ubicacionFisica: UBICACION_ARCHIVO_DEFAULT,
      };
    }
    return {
      estadoFisico:
        (dto.estadoFisico as EstadoFisicoC31) ?? EstadoFisicoC31.EN_TRAMITE,
      ubicacionFisica: dto.ubicacionFisica,
    };
  }

  private async validarActa(manager: EntityManager, actaId?: number | null) {
    if (!actaId) return;
    const existe = await manager.existsBy(ActasEntrega, { id: actaId });
    if (!existe) {
      throw new NotFoundException(`El acta de entrega ${actaId} no existe`);
    }
  }

  /** Mantiene actas_entrega_tesoreria.cantidad_comprobantes = comprobantes vinculados. */
  private async sincronizarCantidadActa(
    manager: EntityManager,
    actaId?: number | null,
  ) {
    if (!actaId) return;
    const cantidad = await manager.countBy(ComprobantesC31, {
      actaEntregaId: actaId,
    });
    await manager.update(ActasEntrega, actaId, {
      cantidadComprobantes: cantidad,
    });
  }

  async create(
    dto: CreateComprobantesC31Dto,
    usuario: Usuario,
  ): Promise<ComprobantesC31> {
    const preventivos = limpiarLista(dto.preventivos);
    const devengados = limpiarLista(dto.devengados);
    this.validarPreventivoODevengado(preventivos, devengados);

    return this.dataSource.transaction(async (manager) => {
      await this.validarActa(manager, dto.actaEntregaId);
      const { estadoFisico, ubicacionFisica } = this.resolverEstadoAlCrear(dto);

      const comprobante = manager.create(ComprobantesC31, {
        actaEntregaId: dto.actaEntregaId,
        tipoC31: (dto.tipoC31 as TipoC31) ?? TipoC31.CON_IMPUTACION,
        numeroComprobante: dto.numeroComprobante,
        montoTotal: dto.montoTotal,
        fechaElaboracion: dto.fechaElaboracion as unknown as Date,
        descripcion: dto.descripcion,
        numeroFolio: dto.numeroFolio,
        gestion:
          dto.gestion ?? new Date(dto.fechaElaboracion as string).getFullYear(),
        estadoFisico,
        ubicacionFisica,
        observaciones: dto.observaciones,
        creadoPorId: usuario.id,
        preventivos: preventivos.map((numeroPreventivo) =>
          manager.create(C31Preventivo, { numeroPreventivo }),
        ),
        devengados: devengados.map((numeroDevengado) =>
          manager.create(C31Devengado, { numeroDevengado }),
        ),
        beneficiarios: limpiarLista(dto.beneficiarios).map(
          (nombreBeneficiario) =>
            manager.create(C31Beneficiario, { nombreBeneficiario }),
        ),
        cheques: limpiarLista(dto.cheques).map((numeroCheque) =>
          manager.create(C31Cheque, { numeroCheque }),
        ),
      });

      const guardado = await manager.save(ComprobantesC31, comprobante);
      await this.sincronizarCantidadActa(manager, dto.actaEntregaId);

      const completo = await manager.findOne(ComprobantesC31, {
        where: { id: guardado.id },
        relations: RELATIONS,
      });
      if (!completo)
        throw new NotFoundException(
          'No se pudo recuperar el comprobante creado',
        );
      return completo;
    });
  }

  async findAll(
    query: FilterComprobantesC31Dto,
  ): Promise<PaginatedResponseDto<ComprobantesC31>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const baseWhere: FindOptionsWhere<ComprobantesC31> = {};
    if (query.estadoFisico)
      baseWhere.estadoFisico = query.estadoFisico as EstadoFisicoC31;
    if (query.tipoC31) baseWhere.tipoC31 = query.tipoC31 as TipoC31;
    if (query.gestion) baseWhere.gestion = query.gestion;
    if (query.actaEntregaId) baseWhere.actaEntregaId = query.actaEntregaId;
    if (query.fechaDesde && query.fechaHasta) {
      baseWhere.fechaElaboracion = Between(
        query.fechaDesde as unknown as Date,
        query.fechaHasta as unknown as Date,
      );
    }

    const where: FindOptionsWhere<ComprobantesC31>[] = query.search
      ? [
          { ...baseWhere, descripcion: Like(`%${query.search}%`) },
          { ...baseWhere, numeroComprobante: Like(`%${query.search}%`) },
          { ...baseWhere, numeroFolio: Like(`%${query.search}%`) },
          { ...baseWhere, ubicacionFisica: Like(`%${query.search}%`) },
        ]
      : [baseWhere];

    const [data, total] = await this.repo.findAndCount({
      where,
      relations: RELATIONS,
      order: { fechaCreacion: query.order ?? 'DESC' },
      skip: paginationSkip(page, pageSize),
      take: pageSize,
    });

    return new PaginatedResponseDto(data, total, page, pageSize);
  }

  async findOne(id: number): Promise<ComprobantesC31> {
    const comprobante = await this.repo.findOne({
      where: { id },
      relations: RELATIONS,
    });
    if (!comprobante)
      throw new NotFoundException('El comprobante C31 no existe');
    return comprobante;
  }

  async update(
    id: number,
    dto: UpdateComprobantesC31Dto,
  ): Promise<ComprobantesC31> {
    const comprobante = await this.findOne(id);

    if (
      dto.estadoFisico &&
      comprobante.estadoFisico === EstadoFisicoC31.PRESTADO
    ) {
      throw new ConflictException(
        'No se puede cambiar el estado físico de un comprobante prestado; registre primero su devolución',
      );
    }

    // Si cambian preventivos o devengados, el resultado final debe conservar al menos uno
    if (dto.preventivos !== undefined || dto.devengados !== undefined) {
      const prev =
        dto.preventivos !== undefined
          ? limpiarLista(dto.preventivos)
          : (comprobante.preventivos ?? []).map(
              (p) => p.numeroPreventivo ?? '',
            );
      const dev =
        dto.devengados !== undefined
          ? limpiarLista(dto.devengados)
          : (comprobante.devengados ?? []).map((d) => d.numeroDevengado ?? '');
      this.validarPreventivoODevengado(prev, dev);
    }
    if (dto.beneficiarios !== undefined) {
      if (limpiarLista(dto.beneficiarios).length === 0) {
        throw new BadRequestException(
          'Debe registrar al menos un beneficiario',
        );
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const actaAnterior = comprobante.actaEntregaId;
      if (dto.actaEntregaId !== undefined) {
        await this.validarActa(manager, dto.actaEntregaId);
      }

      // Campos simples
      const camposSimples: Record<string, unknown> = {};
      if (dto.actaEntregaId !== undefined)
        camposSimples.actaEntregaId = dto.actaEntregaId;
      if (dto.tipoC31 !== undefined) camposSimples.tipoC31 = dto.tipoC31;
      if (dto.numeroComprobante !== undefined)
        camposSimples.numeroComprobante = dto.numeroComprobante;
      if (dto.montoTotal !== undefined)
        camposSimples.montoTotal = dto.montoTotal;
      if (dto.fechaElaboracion !== undefined)
        camposSimples.fechaElaboracion = dto.fechaElaboracion;
      if (dto.descripcion !== undefined)
        camposSimples.descripcion = dto.descripcion;
      if (dto.numeroFolio !== undefined)
        camposSimples.numeroFolio = dto.numeroFolio;
      if (dto.gestion !== undefined) camposSimples.gestion = dto.gestion;
      if (dto.ubicacionFisica !== undefined)
        camposSimples.ubicacionFisica = dto.ubicacionFisica;
      if (dto.observaciones !== undefined)
        camposSimples.observaciones = dto.observaciones;
      if (dto.estadoFisico !== undefined)
        camposSimples.estadoFisico = dto.estadoFisico;

      // RN: cuando el comprobante se vincula (o cambia) a un acta de
      // entrega, se considera entregado/archivado automáticamente, sin
      // importar lo que se haya enviado manualmente en el mismo request.
      const seVinculaAActa =
        dto.actaEntregaId !== undefined &&
        dto.actaEntregaId !== null &&
        dto.actaEntregaId !== actaAnterior;
      if (seVinculaAActa) {
        camposSimples.estadoFisico = EstadoFisicoC31.EN_ARCHIVO;
        camposSimples.ubicacionFisica = UBICACION_ARCHIVO_DEFAULT;
      }

      if (Object.keys(camposSimples).length > 0) {
        await manager.update(ComprobantesC31, id, camposSimples);
      }

      // Reemplazo de colecciones si vienen en el DTO
      if (dto.preventivos !== undefined) {
        await manager.delete(C31Preventivo, { comprobante: { id } });
        await manager.save(
          C31Preventivo,
          limpiarLista(dto.preventivos).map((numeroPreventivo) =>
            manager.create(C31Preventivo, {
              numeroPreventivo,
              comprobante: { id } as ComprobantesC31,
            }),
          ),
        );
      }
      if (dto.devengados !== undefined) {
        await manager.delete(C31Devengado, { comprobante: { id } });
        await manager.save(
          C31Devengado,
          limpiarLista(dto.devengados).map((numeroDevengado) =>
            manager.create(C31Devengado, {
              numeroDevengado,
              comprobante: { id } as ComprobantesC31,
            }),
          ),
        );
      }
      if (dto.beneficiarios !== undefined) {
        await manager.delete(C31Beneficiario, { comprobante: { id } });
        await manager.save(
          C31Beneficiario,
          limpiarLista(dto.beneficiarios).map((nombreBeneficiario) =>
            manager.create(C31Beneficiario, {
              nombreBeneficiario,
              comprobante: { id } as ComprobantesC31,
            }),
          ),
        );
      }
      if (dto.cheques !== undefined) {
        await manager.delete(C31Cheque, { comprobante: { id } });
        await manager.save(
          C31Cheque,
          limpiarLista(dto.cheques).map((numeroCheque) =>
            manager.create(C31Cheque, {
              numeroCheque,
              comprobante: { id } as ComprobantesC31,
            }),
          ),
        );
      }

      if (dto.actaEntregaId !== undefined) {
        await this.sincronizarCantidadActa(manager, actaAnterior);
        await this.sincronizarCantidadActa(manager, dto.actaEntregaId);
      }

      const actualizado = await manager.findOne(ComprobantesC31, {
        where: { id },
        relations: RELATIONS,
      });
      if (!actualizado)
        throw new NotFoundException('El comprobante C31 no existe');
      return actualizado;
    });
  }

  async remove(id: number): Promise<ComprobantesC31> {
    const comprobante = await this.findOne(id);
    if (comprobante.estadoFisico === EstadoFisicoC31.PRESTADO) {
      throw new ConflictException(
        'No se puede eliminar un comprobante que se encuentra prestado',
      );
    }
    return this.dataSource.transaction(async (manager) => {
      const eliminado = await manager.softRemove(ComprobantesC31, comprobante);
      await this.sincronizarCantidadActa(manager, comprobante.actaEntregaId);
      return eliminado;
    });
  }

  /** Devuelve la lista de gestiones (años) con comprobantes registrados, más recientes primero. */
  async findGestiones(): Promise<number[]> {
    const filas = await this.repo
      .createQueryBuilder('c')
      .select('DISTINCT c.gestion', 'gestion')
      .orderBy('c.gestion', 'DESC')
      .getRawMany<{ gestion: number }>();
    return filas.map((f) => Number(f.gestion));
  }

  private static readonly COLUMNAS_EXPORT = [
    { header: 'Nº PREV', key: 'prev', width: 13 },
    { header: 'Nº CHEQUE', key: 'cheque', width: 13 },
    { header: 'BENEFICIARIO', key: 'beneficiario', width: 28 },
    { header: 'DESCRIPCION', key: 'descripcion', width: 63 },
    { header: 'MONTO', key: 'monto', width: 13 },
    { header: 'FECHA', key: 'fecha', width: 13 },
    { header: 'Nº DE FOLIO', key: 'folio', width: 13 },
    // Columna del formato institucional; corresponde a comprobantes_c31.ubicacion_fisica
    { header: 'CARPETA', key: 'carpeta', width: 20 },
  ];

  /** RF-02.2 / plantilla institucional: exporta los comprobantes de una gestión con el mismo formato usado en archivo físico. */
  async exportExcel(gestion?: number): Promise<Buffer> {
    const where: FindOptionsWhere<ComprobantesC31> = {};
    if (gestion) where.gestion = gestion;

    const comprobantes = await this.repo.find({
      where,
      relations: RELATIONS,
      order: { fechaElaboracion: 'ASC' },
    });

    const anioTitulo = gestion ?? new Date().getFullYear();
    const workbook = new ExcelJS.Workbook();
    const hoja = workbook.addWorksheet('Comprobantes');
    const columnas = ComprobantesC31Service.COLUMNAS_EXPORT;

    hoja.columns = columnas.map((c) => ({ key: c.key, width: c.width }));

    const bordeFino: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
      bottom: { style: 'thin' },
    };

    // Fila de título, combinada en todas las columnas
    hoja.mergeCells(1, 1, 1, columnas.length);
    const celdaTitulo = hoja.getCell(1, 1);
    celdaTitulo.value = `COMPROBANTES DE ARCHIVOS GESTION ${anioTitulo}`;
    celdaTitulo.alignment = { horizontal: 'center', vertical: 'middle' };
    columnas.forEach((_c, idx) => {
      hoja.getCell(1, idx + 1).border = bordeFino;
    });

    // Encabezados
    const filaEncabezado = hoja.getRow(2);
    columnas.forEach((c, idx) => {
      const celda = filaEncabezado.getCell(idx + 1);
      celda.value = c.header;
      celda.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      celda.border = bordeFino;
    });

    // Filas de datos
    comprobantes.forEach((c) => {
      const fila = hoja.addRow({
        prev: (c.preventivos ?? []).map((p) => p.numeroPreventivo).join('   '),
        cheque: (c.cheques ?? []).map((ch) => ch.numeroCheque).join('   '),
        beneficiario: (c.beneficiarios ?? [])
          .map((b) => b.nombreBeneficiario)
          .join(', '),
        descripcion: c.descripcion,
        monto: Number(c.montoTotal).toFixed(2),
        fecha: c.fechaElaboracion,
        folio: c.numeroFolio ?? '',
        carpeta: c.ubicacionFisica ?? '',
      });
      fila.eachCell((celda, colNumber) => {
        celda.border = bordeFino;
        celda.alignment = {
          horizontal: colNumber === 4 ? 'left' : 'center',
          vertical: 'middle',
          wrapText: true,
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * RF-02.1: importación masiva desde un Excel ya diligenciado con el mismo
   * formato institucional (Nº PREV, Nº CHEQUE, BENEFICIARIO, DESCRIPCION,
   * MONTO, FECHA, Nº DE FOLIO, CARPETA). La columna CARPETA se guarda como
   * ubicación física del comprobante.
   */
  async importExcel(
    buffer: Buffer,
    gestion: number,
    usuario: Usuario,
  ): Promise<{ creados: number; errores: { fila: number; motivo: string }[] }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const hoja = workbook.worksheets[0];
    if (!hoja) {
      throw new BadRequestException('El archivo no contiene ninguna hoja');
    }

    // Ubica la fila de encabezado buscando "Nº PREV" o "BENEFICIARIO"
    let filaEncabezado = -1;
    hoja.eachRow((row, rowNumber) => {
      if (filaEncabezado !== -1) return;
      const valores = row.values as unknown[];
      const textos = valores
        .map((v) => (typeof v === 'string' ? v.toUpperCase() : ''))
        .join('|');
      if (textos.includes('BENEFICIARIO') && textos.includes('DESCRIPCION')) {
        filaEncabezado = rowNumber;
      }
    });
    if (filaEncabezado === -1) {
      throw new BadRequestException(
        'No se encontró la fila de encabezados (Nº PREV, BENEFICIARIO, DESCRIPCION...) en el archivo',
      );
    }

    const errores: { fila: number; motivo: string }[] = [];
    let creados = 0;

    for (let r = filaEncabezado + 1; r <= hoja.rowCount; r++) {
      const fila = hoja.getRow(r);
      const valores = fila.values as unknown[];
      // ExcelJS indexa desde 1; columnas: 1 vacío, 2..9 = B..I
      const [
        ,
        prev,
        cheque,
        beneficiario,
        descripcion,
        monto,
        fecha,
        folio,
        ubicacion,
      ] = valores;

      const vacia =
        !descripcion && !beneficiario && !monto && (!prev || prev === '');
      if (vacia) continue;

      try {
        if (!descripcion) {
          throw new Error('Falta la descripción del comprobante');
        }
        if (!monto) {
          throw new Error('Falta el monto del comprobante');
        }

        const montoNumerico = Number(textoDeCelda(monto).replace(/,/g, ''));
        if (Number.isNaN(montoNumerico) || montoNumerico <= 0) {
          throw new Error('El monto no es un número válido');
        }

        let fechaElaboracion: Date;
        if (fecha instanceof Date) {
          fechaElaboracion = fecha;
        } else if (typeof fecha === 'string' && fecha.trim()) {
          fechaElaboracion = new Date(fecha);
        } else {
          fechaElaboracion = new Date(`${gestion}-01-01`);
        }
        if (Number.isNaN(fechaElaboracion.getTime())) {
          throw new Error('La fecha no es válida');
        }

        const preventivos = textoDeCelda(prev)
          .split(/\s+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (preventivos.length === 0) preventivos.push('S/N');

        const cheques = textoDeCelda(cheque)
          .split(/\s+/)
          .map((s) => s.trim())
          .filter(Boolean);

        const beneficiarios = (textoDeCelda(beneficiario) || 'S/N')
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean);

        const numeroFolio = textoDeCelda(folio) || undefined;
        const ubicacionFisica =
          textoDeCelda(ubicacion).slice(0, 150) || undefined;

        await this.dataSource.transaction(async (manager) => {
          const comprobante = manager.create(ComprobantesC31, {
            tipoC31: TipoC31.CON_IMPUTACION,
            montoTotal: montoNumerico,
            fechaElaboracion: fechaElaboracion,
            descripcion: textoDeCelda(descripcion),
            numeroFolio,
            ubicacionFisica,
            gestion,
            estadoFisico: EstadoFisicoC31.EN_ARCHIVO,
            creadoPorId: usuario.id,
            preventivos: preventivos.map((numeroPreventivo) =>
              manager.create(C31Preventivo, { numeroPreventivo }),
            ),
            devengados: [],
            beneficiarios: beneficiarios.map((nombreBeneficiario) =>
              manager.create(C31Beneficiario, { nombreBeneficiario }),
            ),
            cheques: cheques.map((numeroCheque) =>
              manager.create(C31Cheque, { numeroCheque }),
            ),
          });
          await manager.save(ComprobantesC31, comprobante);
        });

        creados++;
      } catch (err) {
        errores.push({
          fila: r,
          motivo: err instanceof Error ? err.message : 'Error desconocido',
        });
      }
    }

    return { creados, errores };
  }
}
