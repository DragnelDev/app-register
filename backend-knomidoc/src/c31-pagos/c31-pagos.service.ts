import { rotuloC31 } from '../common/utils/identificador-c31.util';
import { adjuntarRotuloGrupo } from '../common/utils/rotulo-grupo.util';
import { constanciaPagoPdf, listadoPagosPdf } from './pagos-pdf.util';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import {
  Between,
  DataSource,
  EntityManager,
  FindOptionsWhere,
  ILike,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { C31Pago, EstadoPago, TipoPago } from './entities/c31-pago.entity';
import { CreateC31PagoDto } from './dto/create-c31-pago.dto';
import { UpdateC31PagoDto } from './dto/update-c31-pago.dto';
import { FilterC31PagoDto } from './dto/filter-c31-pago.dto';
import {
  ComprobantesC31,
  EstadoFisicoC31,
} from '../comprobantes_c31/entities/comprobantes_c31.entity';
import { validarRangoFecha } from '../common/utils/fechas.util';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { paginationSkip } from '../common/utils/pagination.util';

const RELATIONS = {
  beneficiario: true,
  comprobante: { preventivos: true, devengados: true },
};

const hoy = (): string => new Date().toISOString().slice(0, 10);
const centavos = (n: number): number => Math.round(Number(n) * 100);
const num = (v: unknown): number => Number(v ?? 0);

/** Escapa % y _ para usar el texto tal cual dentro de un ILIKE. */
const literal = (texto: string): string => texto.replace(/[%_\\]/g, '\\$&');

@Injectable()
export class C31PagosService {
  constructor(
    @InjectRepository(C31Pago) private readonly repo: Repository<C31Pago>,
    private readonly dataSource: DataSource,
  ) {}

  /** Suma de los pagos vigentes (no anulados) de un comprobante. */
  private async sumaVigentes(
    manager: EntityManager,
    comprobanteId: number,
    excluirId?: number,
  ): Promise<number> {
    const qb = manager
      .createQueryBuilder(C31Pago, 'p')
      .select('COALESCE(SUM(p.monto), 0)', 'suma')
      .where('p.comprobante_id = :comprobanteId', { comprobanteId })
      .andWhere('p.estado_pago <> :anulado', { anulado: EstadoPago.ANULADO });
    if (excluirId) qb.andWhere('p.id <> :excluirId', { excluirId });
    const fila = await qb.getRawOne<{ suma: string }>();
    return num(fila?.suma);
  }

  /** Reglas comunes de alta y edición. */
  private async validar(
    manager: EntityManager,
    comprobante: ComprobantesC31,
    pago: {
      beneficiarioId: number;
      tipoPago: TipoPago;
      numeroDocumento?: string | null;
      banco?: string | null;
      monto: number;
      estadoPago: EstadoPago;
    },
    excluirId?: number,
  ) {
    if (
      comprobante.estadoFisico === EstadoFisicoC31.ANULADO &&
      pago.estadoPago !== EstadoPago.ANULADO
    ) {
      throw new ConflictException(
        'El comprobante está anulado: no se pueden registrar ni modificar sus pagos',
      );
    }
    if (!(Number(comprobante.montoTotal) > 0)) {
      throw new ConflictException(
        'Complete primero el monto total del comprobante para registrar pagos',
      );
    }
    if (!comprobante.beneficiarios?.some((b) => b.id === pago.beneficiarioId)) {
      throw new BadRequestException(
        'El beneficiario no pertenece a este comprobante',
      );
    }
    if (pago.tipoPago === TipoPago.CHEQUE && !pago.numeroDocumento) {
      throw new BadRequestException('Indique el N° de cheque');
    }

    if (pago.estadoPago !== EstadoPago.ANULADO) {
      const otros = await this.sumaVigentes(
        manager,
        comprobante.id as number,
        excluirId,
      );
      const total = centavos(Number(comprobante.montoTotal));
      if (centavos(otros) + centavos(pago.monto) > total) {
        const disponible = (total - centavos(otros)) / 100;
        throw new ConflictException(
          `Los pagos superarían el monto total del comprobante (Bs ${(total / 100).toFixed(2)}). ` +
            `Disponible para pagar: Bs ${Math.max(disponible, 0).toFixed(2)}`,
        );
      }

      if (pago.numeroDocumento) {
        const qb = manager
          .createQueryBuilder(C31Pago, 'p')
          .where('p.tipo_pago = :tipo', { tipo: pago.tipoPago })
          .andWhere('UPPER(p.numero_documento) = UPPER(:doc)', {
            doc: pago.numeroDocumento,
          })
          .andWhere('p.estado_pago <> :anulado', {
            anulado: EstadoPago.ANULADO,
          });
        if (pago.banco)
          qb.andWhere('UPPER(p.banco) = UPPER(:banco)', { banco: pago.banco });
        else qb.andWhere('p.banco IS NULL');
        if (excluirId) qb.andWhere('p.id <> :excluirId', { excluirId });
        if (await qb.getExists()) {
          throw new ConflictException(
            `Ya existe un pago ${pago.tipoPago === TipoPago.CHEQUE ? 'con el cheque' : 'electrónico con el N°'} ${pago.numeroDocumento}`,
          );
        }
      }
    }
  }

  private async cargarComprobante(manager: EntityManager, id: number) {
    const comprobante = await manager.findOne(ComprobantesC31, {
      where: { id },
      relations: { beneficiarios: true },
    });
    if (!comprobante)
      throw new NotFoundException('El comprobante C31 no existe');
    return comprobante;
  }

  async create(dto: CreateC31PagoDto): Promise<C31Pago> {
    validarRangoFecha('La fecha de pago', dto.fechaPago);
    return this.dataSource.transaction(async (manager) => {
      const comprobante = await this.cargarComprobante(
        manager,
        dto.comprobanteId as number,
      );
      const estadoPago = (dto.estadoPago as EstadoPago) ?? EstadoPago.PENDIENTE;
      const datos = {
        beneficiarioId: dto.beneficiarioId as number,
        tipoPago: dto.tipoPago as TipoPago,
        numeroDocumento: dto.numeroDocumento ?? null,
        banco: dto.banco ?? null,
        monto: dto.monto as number,
        estadoPago,
      };
      await this.validar(manager, comprobante, datos);

      const guardado = await manager.save(
        C31Pago,
        manager.create(C31Pago, {
          ...datos,
          comprobanteId: comprobante.id,
          fechaPago:
            dto.fechaPago ?? (estadoPago === EstadoPago.PAGADO ? hoy() : null),
          observaciones: dto.observaciones ?? null,
        }),
      );
      return manager.findOneOrFail(C31Pago, {
        where: { id: guardado.id },
        relations: RELATIONS,
      });
    });
  }

  async update(id: number, dto: UpdateC31PagoDto): Promise<C31Pago> {
    validarRangoFecha('La fecha de pago', dto.fechaPago);
    return this.dataSource.transaction(async (manager) => {
      const actual = await manager.findOne(C31Pago, { where: { id } });
      if (!actual) throw new NotFoundException('El pago no existe');
      const comprobante = await this.cargarComprobante(
        manager,
        actual.comprobanteId as number,
      );

      const final = {
        beneficiarioId: dto.beneficiarioId ?? (actual.beneficiarioId as number),
        tipoPago: (dto.tipoPago as TipoPago) ?? (actual.tipoPago as TipoPago),
        numeroDocumento:
          dto.numeroDocumento !== undefined
            ? dto.numeroDocumento
            : actual.numeroDocumento,
        banco: dto.banco !== undefined ? dto.banco : actual.banco,
        monto: dto.monto ?? Number(actual.monto ?? 0),
        estadoPago:
          (dto.estadoPago as EstadoPago) ?? (actual.estadoPago as EstadoPago),
      };
      // Un pago migrado sin monto no puede quedar vigente sin definirlo
      if (!(final.monto > 0) && final.estadoPago !== EstadoPago.ANULADO) {
        throw new BadRequestException('Indique el monto del pago');
      }
      await this.validar(manager, comprobante, final, id);

      let fechaPago =
        dto.fechaPago !== undefined ? dto.fechaPago : actual.fechaPago;
      if (final.estadoPago === EstadoPago.PAGADO && !fechaPago)
        fechaPago = hoy();

      await manager.update(C31Pago, id, {
        ...final,
        fechaPago: fechaPago ?? null,
        observaciones:
          dto.observaciones !== undefined
            ? dto.observaciones
            : actual.observaciones,
      });
      return manager.findOneOrFail(C31Pago, {
        where: { id },
        relations: RELATIONS,
      });
    });
  }

  async remove(id: number): Promise<C31Pago> {
    const pago = await this.findOne(id);
    if (pago.estadoPago === EstadoPago.PAGADO) {
      throw new ConflictException(
        'No se puede eliminar un pago ya efectuado; anúlelo para dejar constancia',
      );
    }
    return this.repo.softRemove(pago);
  }

  async findOne(id: number): Promise<C31Pago> {
    const pago = await this.repo.findOne({
      where: { id },
      relations: RELATIONS,
    });
    if (!pago) throw new NotFoundException('El pago no existe');
    return pago;
  }

  /** Condiciones comunes de listado y exportación. */
  private construirWhere(query: FilterC31PagoDto): FindOptionsWhere<C31Pago>[] {
    const base: FindOptionsWhere<C31Pago> = {};
    if (query.tipoPago) base.tipoPago = query.tipoPago as TipoPago;
    if (query.estadoPago) base.estadoPago = query.estadoPago as EstadoPago;
    if (query.comprobanteId) base.comprobanteId = query.comprobanteId;
    if (query.beneficiario) {
      base.beneficiario = {
        nombreBeneficiario: ILike(literal(query.beneficiario.trim())),
      };
    }
    if (query.fechaDesde && query.fechaHasta) {
      base.fechaPago = Between(query.fechaDesde, query.fechaHasta);
    } else if (query.fechaDesde) {
      base.fechaPago = MoreThanOrEqual(query.fechaDesde);
    } else if (query.fechaHasta) {
      base.fechaPago = LessThanOrEqual(query.fechaHasta);
    }
    const comprobanteBase: FindOptionsWhere<ComprobantesC31> = {};
    if (query.gestion) comprobanteBase.gestion = query.gestion;

    const conComprobante = (extra: FindOptionsWhere<ComprobantesC31> = {}) => ({
      ...base,
      ...(Object.keys({ ...comprobanteBase, ...extra }).length > 0
        ? { comprobante: { ...comprobanteBase, ...extra } }
        : {}),
    });

    if (!query.search?.trim()) return [conComprobante()];
    const like = ILike(`%${literal(query.search.trim())}%`);
    return [
      {
        ...conComprobante(),
        beneficiario: {
          ...(base.beneficiario as object),
          nombreBeneficiario: like,
        },
      },
      { ...conComprobante(), numeroDocumento: like },
      { ...conComprobante(), banco: like },
      conComprobante({ descripcion: like }),
      conComprobante({ preventivos: { numeroPreventivo: like } }),
      conComprobante({ devengados: { numeroDevengado: like } }),
    ];
  }

  async findAll(
    query: FilterC31PagoDto,
  ): Promise<PaginatedResponseDto<C31Pago>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const [data, total] = await this.repo.findAndCount({
      where: this.construirWhere(query),
      relations: RELATIONS,
      order: { id: query.order ?? 'DESC' },
      skip: paginationSkip(page, pageSize),
      take: pageSize,
    });
    return new PaginatedResponseDto(data, total, page, pageSize);
  }

  /** Totales para las tarjetas del módulo de pagos. */
  async resumen(query: FilterC31PagoDto) {
    const qb = this.repo
      .createQueryBuilder('p')
      .innerJoin('p.comprobante', 'c')
      .select('p.estado_pago', 'estado')
      .addSelect('p.tipo_pago', 'tipo')
      .addSelect('COUNT(*)', 'cantidad')
      .addSelect('COALESCE(SUM(p.monto), 0)', 'monto')
      .groupBy('p.estado_pago')
      .addGroupBy('p.tipo_pago');
    if (query.gestion) qb.andWhere('c.gestion = :g', { g: query.gestion });
    if (query.fechaDesde)
      qb.andWhere('p.fecha_pago >= :fd', { fd: query.fechaDesde });
    if (query.fechaHasta)
      qb.andWhere('p.fecha_pago <= :fh', { fh: query.fechaHasta });

    const filas = await qb.getRawMany<{
      estado: string;
      tipo: string;
      cantidad: string;
      monto: string;
    }>();

    const acumular = (estado: EstadoPago) =>
      filas
        .filter((f) => f.estado === estado)
        .reduce(
          (a, f) => ({
            cantidad: a.cantidad + num(f.cantidad),
            monto: a.monto + num(f.monto),
          }),
          { cantidad: 0, monto: 0 },
        );

    const porTipo = [TipoPago.CHEQUE, TipoPago.ELECTRONICO].map((tipo) => {
      const vigentes = filas.filter(
        (f) => f.tipo === tipo && f.estado !== EstadoPago.ANULADO,
      );
      return {
        tipo,
        cantidad: vigentes.reduce((s, f) => s + num(f.cantidad), 0),
        monto: vigentes.reduce((s, f) => s + num(f.monto), 0),
      };
    });

    return {
      pagado: acumular(EstadoPago.PAGADO),
      pendiente: acumular(EstadoPago.PENDIENTE),
      anulado: acumular(EstadoPago.ANULADO),
      porTipo,
    };
  }

  /** Pagos agrupados por beneficiario (mismo nombre en distintos comprobantes = una persona). */
  async porBeneficiario(query: FilterC31PagoDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const nombre = 'UPPER(TRIM(b.nombre_beneficiario))';

    const filtrar = (qb: ReturnType<typeof this.repo.createQueryBuilder>) => {
      qb.innerJoin('p.beneficiario', 'b')
        .innerJoin('p.comprobante', 'c')
        .where('p.estado_pago <> :anulado', { anulado: EstadoPago.ANULADO });
      if (query.search?.trim())
        qb.andWhere('b.nombre_beneficiario ILIKE :s', {
          s: `%${literal(query.search.trim())}%`,
        });
      if (query.gestion) qb.andWhere('c.gestion = :g', { g: query.gestion });
      return qb;
    };

    const [filas, conteo] = await Promise.all([
      filtrar(this.repo.createQueryBuilder('p'))
        .select(nombre, 'nombre')
        .addSelect('COUNT(p.id)', 'cantidad_pagos')
        .addSelect('COUNT(DISTINCT c.id)', 'cantidad_comprobantes')
        .addSelect(
          "COALESCE(SUM(CASE WHEN p.estado_pago = 'PAGADO' THEN p.monto END), 0)",
          'monto_pagado',
        )
        .addSelect(
          "COALESCE(SUM(CASE WHEN p.estado_pago = 'PENDIENTE' THEN p.monto END), 0)",
          'monto_pendiente',
        )
        .addSelect('MAX(p.fecha_pago)', 'ultimo_pago')
        .groupBy(nombre)
        .orderBy('monto_pagado', 'DESC')
        .addOrderBy('nombre', 'ASC')
        .offset(paginationSkip(page, pageSize))
        .limit(pageSize)
        .getRawMany<{
          nombre: string;
          cantidad_pagos: string;
          cantidad_comprobantes: string;
          monto_pagado: string;
          monto_pendiente: string;
          ultimo_pago: string | null;
        }>(),
      filtrar(this.repo.createQueryBuilder('p'))
        .select(`COUNT(DISTINCT ${nombre})`, 'total')
        .getRawOne<{ total: string }>(),
    ]);

    return new PaginatedResponseDto(
      filas.map((f) => ({
        nombre: f.nombre,
        cantidadPagos: num(f.cantidad_pagos),
        cantidadComprobantes: num(f.cantidad_comprobantes),
        montoPagado: num(f.monto_pagado),
        montoPendiente: num(f.monto_pendiente),
        ultimoPago: f.ultimo_pago,
      })),
      num(conteo?.total),
      page,
      pageSize,
    );
  }

  /** Estado de pagos de un comprobante, agrupado por beneficiario (pestaña "Pagos" del detalle). */
  async porComprobante(comprobanteId: number) {
    const comprobante = await this.dataSource.manager.findOne(ComprobantesC31, {
      where: { id: comprobanteId },
      relations: { beneficiarios: true },
    });
    if (!comprobante)
      throw new NotFoundException('El comprobante C31 no existe');

    const pagos = await this.repo.find({
      where: { comprobanteId },
      order: { id: 'ASC' },
    });

    const montoTotal = Number(comprobante.montoTotal);
    const vigentes = pagos.filter((p) => p.estadoPago !== EstadoPago.ANULADO);
    const pagado = vigentes
      .filter((p) => p.estadoPago === EstadoPago.PAGADO)
      .reduce((s, p) => s + Number(p.monto ?? 0), 0);
    const pendiente = vigentes
      .filter((p) => p.estadoPago === EstadoPago.PENDIENTE)
      .reduce((s, p) => s + Number(p.monto ?? 0), 0);

    return {
      comprobanteId,
      estadoFisico: comprobante.estadoFisico,
      resumen: {
        montoTotal,
        pagado,
        pendiente,
        /** Parte del total sin pago asignado (retenciones, impuestos u otros). */
        sinAsignar: Math.round((montoTotal - pagado - pendiente) * 100) / 100,
      },
      beneficiarios: (comprobante.beneficiarios ?? []).map((b) => {
        const suyos = pagos.filter((p) => p.beneficiarioId === b.id);
        const activos = suyos.filter(
          (p) => p.estadoPago !== EstadoPago.ANULADO,
        );
        return {
          id: b.id,
          nombreBeneficiario: b.nombreBeneficiario,
          totalPagado: activos
            .filter((p) => p.estadoPago === EstadoPago.PAGADO)
            .reduce((s, p) => s + Number(p.monto ?? 0), 0),
          totalPendiente: activos
            .filter((p) => p.estadoPago === EstadoPago.PENDIENTE)
            .reduce((s, p) => s + Number(p.monto ?? 0), 0),
          pagos: suyos,
        };
      }),
    };
  }

  async exportExcel(query: FilterC31PagoDto): Promise<Buffer> {
    const pagos = await this.repo.find({
      where: this.construirWhere(query),
      relations: RELATIONS,
      order: { id: 'ASC' },
      take: 10000,
    });

    const libro = new ExcelJS.Workbook();
    const hoja = libro.addWorksheet('Pagos');
    hoja.columns = [
      { header: 'GESTIÓN', key: 'gestion', width: 10 },
      { header: 'Nº PREV / DEV', key: 'ident', width: 16 },
      { header: 'BENEFICIARIO', key: 'beneficiario', width: 34 },
      { header: 'TIPO', key: 'tipo', width: 14 },
      { header: 'Nº DOCUMENTO', key: 'doc', width: 18 },
      { header: 'BANCO', key: 'banco', width: 20 },
      { header: 'MONTO (Bs)', key: 'monto', width: 14 },
      { header: 'FECHA DE PAGO', key: 'fecha', width: 14 },
      { header: 'ESTADO', key: 'estado', width: 12 },
      { header: 'DESCRIPCIÓN', key: 'descripcion', width: 60 },
    ];
    hoja.getRow(1).font = { bold: true };
    pagos.forEach((p) =>
      hoja.addRow({
        gestion: p.comprobante?.gestion,
        ident: rotuloC31(p.comprobante),
        beneficiario: p.beneficiario?.nombreBeneficiario ?? '',
        tipo: p.tipoPago === TipoPago.CHEQUE ? 'Cheque' : 'Pago electrónico',
        doc: p.numeroDocumento ?? '',
        banco: p.banco ?? '',
        monto: p.monto ?? null,
        fecha: p.fechaPago ?? '',
        estado: p.estadoPago,
        descripcion: p.comprobante?.descripcion ?? '',
      }),
    );
    return Buffer.from(await libro.xlsx.writeBuffer());
  }

  /** PDF con el listado de pagos según los filtros de pantalla. */
  async listadoPdf(query: FilterC31PagoDto): Promise<Buffer> {
    const pagos = await this.repo.find({
      where: this.construirWhere(query),
      relations: RELATIONS,
      order: { id: 'ASC' },
      take: 5000,
    });
    await adjuntarRotuloGrupo(
      this.repo.manager,
      pagos.map((p) => p.comprobante).filter(Boolean),
    );
    const ETQ: Record<string, string> = {
      gestion: 'Gestión',
      search: 'Búsqueda',
      beneficiario: 'Beneficiario',
      tipoPago: 'Forma',
      estadoPago: 'Estado',
      fechaDesde: 'Desde',
      fechaHasta: 'Hasta',
    };
    const filtros = Object.entries(ETQ)
      .map(([k, etq]) => {
        const v = (query as unknown as Record<string, unknown>)[k];
        return v === undefined || v === '' || v === null
          ? ''
          : `${etq}: ${String(v)}`;
      })
      .filter(Boolean)
      .join(' · ');
    return listadoPagosPdf(pagos, { filtros });
  }

  /** Constancia de pago individual en PDF. */
  async constanciaPdf(id: number): Promise<Buffer> {
    const pago = await this.findOne(id);
    if (pago.comprobante)
      await adjuntarRotuloGrupo(this.repo.manager, pago.comprobante);
    if (pago.comprobanteId == null)
      throw new BadRequestException('El pago no tiene un comprobante asociado');
    const datos = await this.porComprobante(pago.comprobanteId);
    return constanciaPagoPdf(pago, {
      montoTotal: datos.resumen.montoTotal,
      pagado: datos.resumen.pagado,
      saldo:
        Math.round((datos.resumen.montoTotal - datos.resumen.pagado) * 100) /
        100,
    });
  }
}
