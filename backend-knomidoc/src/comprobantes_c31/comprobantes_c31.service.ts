import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, In, Like, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import {
  ComprobantesC31,
  EstadoAprobacionC31,
  EstadoFisicoC31,
} from './entities/comprobantes_c31.entity';
import {
  CarpetaUbicacionItemDto,
  CreateComprobantesC31Dto,
} from './dto/create-comprobantes_c31.dto';
import { UpdateComprobantesC31Dto } from './dto/update-comprobantes_c31.dto';
import { FilterComprobantesC31Dto } from './dto/filter-comprobantes_c31.dto';
import { C31Preventivo } from '../c31-preventivos/entities/c31-preventivo.entity';
import { C31Devengado } from '../c31-devengados/entities/c31-devengado.entity';
import { C31Beneficiario } from '../c31-beneficiarios/entities/c31-beneficiario.entity';
import { C31Cheque } from '../c31-cheques/entities/c31-cheque.entity';
import { C31CarpetasUbicacion } from '../c31-carpetas-ubicacion/entities/c31-carpetas-ubicacion.entity';
import { Carpeta } from '../carpetas/entities/carpeta.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { paginationSkip } from '../common/utils/pagination.util';
import { Usuario } from '../usuarios/entities/usuario.entity';

const RELATIONS = {
  notaEntrega: true,
  creadoPor: true,
  preventivos: true,
  devengados: true,
  beneficiarios: true,
  cheques: true,
  carpetasUbicacion: {
    carpeta: true,
  },
};

@Injectable()
export class ComprobantesC31Service {
  constructor(
    @InjectRepository(ComprobantesC31)
    private readonly repo: Repository<ComprobantesC31>,
    @InjectRepository(Carpeta)
    private readonly carpetasRepo: Repository<Carpeta>,
    private readonly dataSource: DataSource,
  ) {}

  private validarCarpetas(carpetas: CarpetaUbicacionItemDto[]) {
    if (!carpetas || carpetas.length === 0) {
      throw new BadRequestException(
        'Debe indicar al menos 1 carpeta de ubicación',
      );
    }
    if (carpetas.length > 5) {
      throw new BadRequestException(
        'Un comprobante C31 no puede ocupar más de 5 carpetas',
      );
    }
    const partes = carpetas.map((c) => c.numeroParte);
    if (new Set(partes).size !== partes.length) {
      throw new BadRequestException(
        'Los números de parte de las carpetas no pueden repetirse',
      );
    }
  }

  async create(
    dto: CreateComprobantesC31Dto,
    usuario: Usuario,
  ): Promise<ComprobantesC31> {
    this.validarCarpetas(dto.carpetas);

    // Verifica que las carpetas indicadas existan
    const carpetaIds = dto.carpetas.map((c) => c.carpetaId as number);
    const carpetasExistentes = await this.carpetasRepo.findBy({
      id: In(carpetaIds),
    });
    const idsValidos = new Set(carpetasExistentes.map((c) => c.id));
    for (const id of carpetaIds) {
      if (!idsValidos.has(id)) {
        throw new NotFoundException(`La carpeta con id ${id} no existe`);
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const comprobante = manager.create(ComprobantesC31, {
        notaEntregaId: dto.notaEntregaId,
        montoTotal: dto.montoTotal,
        fechaElaboracion: dto.fechaElaboracion,
        descripcion: dto.descripcion,
        numeroFolio: dto.numeroFolio,
        gestion:
          dto.gestion ?? new Date(dto.fechaElaboracion as string).getFullYear(),
        estaFoliado: dto.estaFoliado ?? false,
        cantidadCarpetas: dto.carpetas.length,
        estadoAprobacion: EstadoAprobacionC31.PENDIENTE,
        estadoFisico: EstadoFisicoC31.EN_ARCHIVO,
        creadoPorId: usuario.id,
        preventivos: dto.preventivos.map((numeroPreventivo) =>
          manager.create(C31Preventivo, { numeroPreventivo }),
        ),
        devengados: dto.devengados.map((numeroDevengado) =>
          manager.create(C31Devengado, { numeroDevengado }),
        ),
        beneficiarios: dto.beneficiarios.map((nombreBeneficiario) =>
          manager.create(C31Beneficiario, { nombreBeneficiario }),
        ),
        cheques: (dto.cheques ?? []).map((numeroCheque) =>
          manager.create(C31Cheque, { numeroCheque }),
        ),
        carpetasUbicacion: dto.carpetas.map((c) =>
          manager.create(C31CarpetasUbicacion, {
            carpeta: { id: c.carpetaId } as Carpeta,
            numeroParte: c.numeroParte,
          }),
        ),
      });

      const guardado = await manager.save(ComprobantesC31, comprobante);
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

    const baseWhere: Record<string, any> = {};
    if (query.estadoAprobacion)
      baseWhere.estadoAprobacion = query.estadoAprobacion;
    if (query.estadoFisico) baseWhere.estadoFisico = query.estadoFisico;
    if (query.gestion) baseWhere.gestion = query.gestion;
    if (query.fechaDesde && query.fechaHasta) {
      baseWhere.fechaElaboracion = Between(query.fechaDesde, query.fechaHasta);
    }

    const where = query.search
      ? [{ ...baseWhere, descripcion: Like(`%${query.search}%`) }]
      : baseWhere;

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

    if (comprobante.estadoAprobacion === EstadoAprobacionC31.APROBADO) {
      throw new ConflictException(
        'No se puede modificar un comprobante que ya fue aprobado',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      // Campos simples
      const camposSimples: Partial<ComprobantesC31> = {};
      if (dto.notaEntregaId !== undefined)
        camposSimples.notaEntregaId = dto.notaEntregaId;
      if (dto.montoTotal !== undefined)
        camposSimples.montoTotal = dto.montoTotal;
      if (dto.fechaElaboracion !== undefined)
        camposSimples.fechaElaboracion =
          dto.fechaElaboracion as unknown as Date;
      if (dto.descripcion !== undefined)
        camposSimples.descripcion = dto.descripcion;
      if (dto.numeroFolio !== undefined)
        camposSimples.numeroFolio = dto.numeroFolio;
      if (dto.gestion !== undefined) camposSimples.gestion = dto.gestion;
      if (dto.estaFoliado !== undefined)
        camposSimples.estaFoliado = dto.estaFoliado;

      await manager.update(ComprobantesC31, id, camposSimples);

      // Reemplazo de colecciones si vienen en el DTO
      if (dto.preventivos) {
        await manager.delete(C31Preventivo, { comprobante: { id } });
        await manager.save(
          C31Preventivo,
          dto.preventivos.map((numeroPreventivo) =>
            manager.create(C31Preventivo, {
              numeroPreventivo,
              comprobante: { id } as ComprobantesC31,
            }),
          ),
        );
      }
      if (dto.devengados) {
        await manager.delete(C31Devengado, { comprobante: { id } });
        await manager.save(
          C31Devengado,
          dto.devengados.map((numeroDevengado) =>
            manager.create(C31Devengado, {
              numeroDevengado,
              comprobante: { id } as ComprobantesC31,
            }),
          ),
        );
      }
      if (dto.beneficiarios) {
        await manager.delete(C31Beneficiario, { comprobante: { id } });
        await manager.save(
          C31Beneficiario,
          dto.beneficiarios.map((nombreBeneficiario) =>
            manager.create(C31Beneficiario, {
              nombreBeneficiario,
              comprobante: { id } as ComprobantesC31,
            }),
          ),
        );
      }
      if (dto.cheques) {
        await manager.delete(C31Cheque, { comprobante: { id } });
        await manager.save(
          C31Cheque,
          dto.cheques.map((numeroCheque) =>
            manager.create(C31Cheque, {
              numeroCheque,
              comprobante: { id } as ComprobantesC31,
            }),
          ),
        );
      }
      if (dto.carpetas) {
        this.validarCarpetas(dto.carpetas);
        await manager.delete(C31CarpetasUbicacion, { comprobante: { id } });
        await manager.save(
          C31CarpetasUbicacion,
          dto.carpetas.map((c) =>
            manager.create(C31CarpetasUbicacion, {
              carpeta: { id: c.carpetaId } as Carpeta,
              numeroParte: c.numeroParte,
              comprobante: { id } as ComprobantesC31,
            }),
          ),
        );
        await manager.update(ComprobantesC31, id, {
          cantidadCarpetas: dto.carpetas.length,
        });
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

  /** RF-02.3: aprobación exclusiva de ADMIN */
  async aprobar(id: number): Promise<ComprobantesC31> {
    const comprobante = await this.findOne(id);
    if (comprobante.estadoAprobacion !== EstadoAprobacionC31.PENDIENTE) {
      throw new ConflictException(
        'Solo se pueden aprobar comprobantes en estado PENDIENTE',
      );
    }
    comprobante.estadoAprobacion = EstadoAprobacionC31.APROBADO;
    comprobante.motivoRechazo = undefined;
    return this.repo.save(comprobante);
  }

  async rechazar(id: number, motivo: string): Promise<ComprobantesC31> {
    const comprobante = await this.findOne(id);
    if (comprobante.estadoAprobacion !== EstadoAprobacionC31.PENDIENTE) {
      throw new ConflictException(
        'Solo se pueden rechazar comprobantes en estado PENDIENTE',
      );
    }
    comprobante.estadoAprobacion = EstadoAprobacionC31.RECHAZADO;
    comprobante.motivoRechazo = motivo;
    return this.repo.save(comprobante);
  }

  async remove(id: number): Promise<ComprobantesC31> {
    const comprobante = await this.findOne(id);
    if (comprobante.estadoFisico === EstadoFisicoC31.PRESTADO) {
      throw new ConflictException(
        'No se puede eliminar un comprobante que se encuentra prestado',
      );
    }
    return this.repo.softRemove(comprobante);
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
    { header: 'CARPETA', key: 'carpeta', width: 13 },
  ];

  /** RF-02.2 / plantilla institucional: exporta los comprobantes de una gestión con el mismo formato usado en archivo físico. */
  async exportExcel(gestion?: number): Promise<Buffer> {
    const where: Record<string, any> = {};
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
        carpeta: (c.carpetasUbicacion ?? [])
          .map((u) => u.carpeta?.codigoCarpeta ?? '')
          .join(', '),
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
   * MONTO, FECHA, Nº DE FOLIO, CARPETA). Crea automáticamente las carpetas
   * físicas referenciadas si todavía no existen en el sistema.
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
        carpetaCodigo,
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

        const montoNumerico = Number(
          String(monto).toString().replace(/,/g, ''),
        );
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

        const preventivos = String(prev ?? '')
          .split(/\s+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (preventivos.length === 0) preventivos.push('S/N');

        const cheques = String(cheque ?? '')
          .split(/\s+/)
          .map((s) => s.trim())
          .filter(Boolean);

        const beneficiarios = String(beneficiario ?? 'S/N')
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean);

        const codigoCarpeta = String(carpetaCodigo ?? '').trim();
        let carpetaId: number | undefined;
        if (codigoCarpeta) {
          let carpeta = await this.carpetasRepo.findOne({
            where: { codigoCarpeta },
          });
          if (!carpeta) {
            carpeta = await this.carpetasRepo.save(
              this.carpetasRepo.create({
                codigoCarpeta,
                ubicacionFisica: 'Importado desde Excel',
                estadoFisico: 'EN_ARCHIVO',
              }),
            );
          }
          carpetaId = carpeta.id;
        }

        await this.dataSource.transaction(async (manager) => {
          const comprobante = manager.create(ComprobantesC31, {
            montoTotal: montoNumerico,
            fechaElaboracion: fechaElaboracion as unknown as Date,
            descripcion: String(descripcion),
            numeroFolio: folio ? Number(folio) : undefined,
            estaFoliado: Boolean(folio),
            gestion,
            cantidadCarpetas: carpetaId ? 1 : 0,
            estadoAprobacion: EstadoAprobacionC31.PENDIENTE,
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
            carpetasUbicacion: carpetaId
              ? [
                  manager.create(C31CarpetasUbicacion, {
                    carpeta: { id: carpetaId } as Carpeta,
                    numeroParte: 1,
                  }),
                ]
              : [],
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
