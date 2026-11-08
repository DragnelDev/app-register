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
  ILike,
  In,
  LessThan,
  MoreThanOrEqual,
  LessThanOrEqual,
  Repository,
} from 'typeorm';
import { CreatePrestamosNotaDto } from './dto/create-prestamos-nota.dto';
import { UpdatePrestamosNotaDto } from './dto/update-prestamos-nota.dto';
import { DevolverPrestamosNotaDto } from './dto/devolver-prestamos-nota.dto';
import { FilterPrestamosNotaDto } from './dto/filter-prestamos-nota.dto';
import {
  EstadoPrestamoNota,
  PrestamosNota,
} from './entities/prestamos-nota.entity';
import {
  ComprobantesC31,
  ESTADO_FISICO_LABELS,
  EstadoFisicoC31,
} from '../comprobantes_c31/entities/comprobantes_c31.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { paginationSkip } from '../common/utils/pagination.util';
import { Usuario } from '../usuarios/entities/usuario.entity';
import {
  validarOrdenFechas,
  validarRangoFecha,
} from '../common/utils/fechas.util';
import { generarNotaPrestamoPdf } from './nota-pdf.util';
import {
  EstadoFuncionario,
  Funcionario,
} from '../funcionarios/entities/funcionario.entity';
import { registrarCambioEstado } from '../c31-historial/c31-historial.helper';

const RELATIONS = {
  comprobante: { preventivos: true, devengados: true, beneficiarios: true },
  funcionario: true,
  registradoPor: true,
  recibidoPor: true,
};

const hoy = (): string => new Date().toISOString().slice(0, 10);

@Injectable()
export class PrestamosNotaService {
  constructor(
    @InjectRepository(PrestamosNota)
    private readonly repo: Repository<PrestamosNota>,
    private readonly dataSource: DataSource,
  ) {}

  private validarFechas(prestamo?: string, estimada?: string | null) {
    if (prestamo && estimada && estimada < prestamo) {
      throw new BadRequestException(
        'La fecha de devolución estimada no puede ser anterior a la fecha de préstamo',
      );
    }
  }

  /** Funcionario activo del directorio + copia de sus datos para la nota. */
  private async datosFuncionario(
    manager: EntityManager,
    funcionarioId: number,
    institucion?: string,
  ) {
    const f = await manager.findOne(Funcionario, {
      where: { id: funcionarioId },
    });
    if (!f) throw new NotFoundException('El funcionario no existe');
    if (f.estado === EstadoFuncionario.INACTIVO) {
      throw new BadRequestException(
        'El funcionario seleccionado está inactivo',
      );
    }
    return {
      funcionarioId: f.id as number,
      funcionarioResponsable: `${f.nombres} ${f.apellidos}`,
      institucionSolicitante: institucion ?? (f.unidadOficina as string),
    };
  }

  /** Cada comprobante debe existir y estar archivado correctamente. */
  private async validarComprobantes(
    manager: EntityManager,
    ids: number[],
  ): Promise<void> {
    const comprobantes = await manager.findBy(ComprobantesC31, {
      id: In(ids),
    });
    const porId = new Map(comprobantes.map((c) => [c.id, c]));
    for (const id of ids) {
      const comprobante = porId.get(id);
      if (!comprobante) {
        throw new NotFoundException(`El comprobante ${id} no existe`);
      }
      if (comprobante.estadoFisico === EstadoFisicoC31.PRESTADO) {
        throw new ConflictException(
          `El comprobante ${id} ya se encuentra prestado`,
        );
      }
      if (comprobante.estadoFisico !== EstadoFisicoC31.ARCHIVADO) {
        throw new ConflictException(
          `El comprobante ${id} no puede prestarse: solo se prestan comprobantes archivados correctamente (estado actual: ${ESTADO_FISICO_LABELS[comprobante.estadoFisico as EstadoFisicoC31]})`,
        );
      }
    }
  }

  /**
   * Crea la nota con un préstamo por comprobante. Queda en BORRADOR (editable
   * y con vista previa del PDF) hasta aprobarla; con `aprobar: true` se
   * entrega de inmediato.
   */
  /** NP-0001/2026: siguiente correlativo de la gestión en curso. */
  private async siguienteNumeroNota(manager: EntityManager) {
    const anio = new Date().getFullYear();
    const [{ max }] = await manager.query<{ max: number | null }[]>(
      `SELECT MAX(split_part(substring(numero_nota_solicitud from '^NP-([0-9]+)/${anio}$'), '/', 1)::int) AS max
       FROM prestamos_nota WHERE numero_nota_solicitud ~ '^NP-[0-9]+/${anio}$'`,
    );
    return `NP-${String((max ?? 0) + 1).padStart(4, '0')}/${anio}`;
  }

  async create(
    dto: CreatePrestamosNotaDto,
    usuario?: Usuario,
  ): Promise<PrestamosNota[]> {
    validarRangoFecha('La fecha de préstamo', dto.fechaPrestamo);
    validarOrdenFechas(
      'La devolución estimada no puede ser anterior a la fecha de préstamo',
      dto.fechaPrestamo ?? new Date().toISOString(),
      dto.fechaDevolucionEstimada,
    );
    const comprobanteIds = [...new Set(dto.comprobanteIds)];
    const fechaPrestamo = dto.fechaPrestamo ?? hoy();
    this.validarFechas(fechaPrestamo, dto.fechaDevolucionEstimada);

    return this.dataSource.transaction(async (manager) => {
      const numeroNota =
        dto.numeroNotaSolicitud || (await this.siguienteNumeroNota(manager));
      if (
        await manager.existsBy(PrestamosNota, {
          numeroNotaSolicitud: numeroNota,
        })
      ) {
        throw new ConflictException(
          `Ya existe una nota con el N° ${numeroNota}`,
        );
      }
      await this.validarComprobantes(manager, comprobanteIds);
      const datosFunc = await this.datosFuncionario(
        manager,
        dto.funcionarioId as number,
        dto.institucionSolicitante,
      );

      const prestamos = comprobanteIds.map((comprobanteId) =>
        manager.create(PrestamosNota, {
          comprobanteId,
          numeroNotaSolicitud: numeroNota,
          ...datosFunc,
          referencia: dto.referencia,
          destinatario: dto.destinatario ?? datosFunc.funcionarioResponsable,
          fechaPrestamo,
          fechaDevolucionEstimada: dto.fechaDevolucionEstimada,
          estadoPrestamo: EstadoPrestamoNota.BORRADOR,
          observaciones: dto.observaciones,
          registradoPorId: usuario?.id ?? null,
        }),
      );
      const guardados = await manager.save(PrestamosNota, prestamos);

      if (dto.aprobar) {
        await this.entregar(manager, guardados, usuario);
      }

      return manager.find(PrestamosNota, {
        where: { id: In(guardados.map((p) => p.id as number)) },
        relations: RELATIONS,
        order: { id: 'ASC' },
      });
    });
  }

  /** Marca los comprobantes como PRESTADO y las filas como ENTREGADO. */
  private async entregar(
    manager: EntityManager,
    filas: PrestamosNota[],
    usuario?: Usuario,
  ): Promise<void> {
    const ids = filas.map((f) => f.comprobanteId as number);
    await this.validarComprobantes(manager, ids);
    await manager.update(
      PrestamosNota,
      { id: In(filas.map((f) => f.id as number)) },
      { estadoPrestamo: EstadoPrestamoNota.ENTREGADO },
    );
    await manager.update(
      ComprobantesC31,
      { id: In(ids) },
      { estadoFisico: EstadoFisicoC31.PRESTADO },
    );
    const primera = filas[0] as PrestamosNota;
    for (const comprobanteId of ids) {
      await registrarCambioEstado(manager, {
        comprobanteId,
        estadoAnterior: EstadoFisicoC31.ARCHIVADO,
        estadoNuevo: EstadoFisicoC31.PRESTADO,
        origen: 'PRESTAMO',
        usuarioId: usuario?.id,
        referencia: `Nota ${primera.numeroNotaSolicitud}`,
        detalle: `Préstamo a ${primera.institucionSolicitante} (recibe ${primera.funcionarioResponsable})`,
      });
    }
  }

  /** Filas (una por comprobante) de una nota. */
  private async filasDeNota(
    manager: EntityManager,
    numeroNota: string,
  ): Promise<PrestamosNota[]> {
    const filas = await manager.find(PrestamosNota, {
      where: { numeroNotaSolicitud: numeroNota },
      order: { id: 'ASC' },
    });
    if (filas.length === 0) {
      throw new NotFoundException(`No existe la nota ${numeroNota}`);
    }
    return filas;
  }

  /** Edita los textos/fechas de TODA la nota mientras siga en BORRADOR. */
  async updateNota(
    numeroNota: string,
    dto: UpdatePrestamosNotaDto,
  ): Promise<PrestamosNota[]> {
    return this.dataSource.transaction(async (manager) => {
      const filas = await this.filasDeNota(manager, numeroNota);
      if (filas.some((f) => f.estadoPrestamo !== EstadoPrestamoNota.BORRADOR)) {
        throw new ConflictException(
          'Solo se puede editar la nota completa mientras esté en borrador',
        );
      }
      const prestamo = dto.fechaPrestamo ?? filas[0]?.fechaPrestamo;
      const estimada =
        dto.fechaDevolucionEstimada ?? filas[0]?.fechaDevolucionEstimada;
      this.validarFechas(prestamo, estimada);

      if (
        dto.numeroNotaSolicitud &&
        dto.numeroNotaSolicitud !== numeroNota &&
        (await manager.existsBy(PrestamosNota, {
          numeroNotaSolicitud: dto.numeroNotaSolicitud,
        }))
      ) {
        throw new ConflictException(
          `Ya existe una nota con el N° ${dto.numeroNotaSolicitud}`,
        );
      }

      const cambios: Partial<PrestamosNota> = {};
      if (dto.numeroNotaSolicitud !== undefined)
        cambios.numeroNotaSolicitud = dto.numeroNotaSolicitud;
      if (dto.funcionarioId !== undefined) {
        Object.assign(
          cambios,
          await this.datosFuncionario(
            manager,
            dto.funcionarioId,
            dto.institucionSolicitante,
          ),
        );
        // Si no se fijó un destinatario aparte, sigue al nuevo funcionario
        if (dto.destinatario === undefined)
          cambios.destinatario = cambios.funcionarioResponsable;
      } else if (dto.institucionSolicitante !== undefined) {
        cambios.institucionSolicitante = dto.institucionSolicitante;
      }
      if (dto.referencia !== undefined) cambios.referencia = dto.referencia;
      if (dto.destinatario !== undefined)
        cambios.destinatario = dto.destinatario;
      if (dto.fechaPrestamo !== undefined)
        cambios.fechaPrestamo = dto.fechaPrestamo;
      if (dto.fechaDevolucionEstimada !== undefined)
        cambios.fechaDevolucionEstimada = dto.fechaDevolucionEstimada;
      if (dto.observaciones !== undefined)
        cambios.observaciones = dto.observaciones;

      if (Object.keys(cambios).length > 0) {
        await manager.update(
          PrestamosNota,
          { id: In(filas.map((f) => f.id as number)) },
          cambios,
        );
      }
      return manager.find(PrestamosNota, {
        where: { id: In(filas.map((f) => f.id as number)) },
        relations: RELATIONS,
        order: { id: 'ASC' },
      });
    });
  }

  /** Aprueba la nota: los comprobantes salen del archivo (pasan a PRESTADO). */
  async aprobarNota(
    numeroNota: string,
    usuario?: Usuario,
  ): Promise<PrestamosNota[]> {
    return this.dataSource.transaction(async (manager) => {
      const filas = await this.filasDeNota(manager, numeroNota);
      if (filas.some((f) => f.estadoPrestamo !== EstadoPrestamoNota.BORRADOR)) {
        throw new ConflictException('La nota ya fue aprobada');
      }
      await this.entregar(manager, filas, usuario);
      return manager.find(PrestamosNota, {
        where: { id: In(filas.map((f) => f.id as number)) },
        relations: RELATIONS,
        order: { id: 'ASC' },
      });
    });
  }

  async findAll(
    query: FilterPrestamosNotaDto,
  ): Promise<PaginatedResponseDto<PrestamosNota>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const base: FindOptionsWhere<PrestamosNota> = {};
    if (query.estadoPrestamo)
      base.estadoPrestamo = query.estadoPrestamo as EstadoPrestamoNota;
    if (query.comprobanteId) base.comprobanteId = query.comprobanteId;
    if (query.funcionarioId) base.funcionarioId = query.funcionarioId;
    if (query.numeroNota?.trim())
      base.numeroNotaSolicitud = ILike(`%${query.numeroNota.trim()}%`);
    if (query.institucion?.trim())
      base.institucionSolicitante = ILike(`%${query.institucion.trim()}%`);
    if (query.gestion) base.comprobante = { gestion: query.gestion };
    if (query.fechaDesde && query.fechaHasta)
      base.fechaPrestamo = Between(query.fechaDesde, query.fechaHasta);
    else if (query.fechaDesde)
      base.fechaPrestamo = MoreThanOrEqual(query.fechaDesde);
    else if (query.fechaHasta)
      base.fechaPrestamo = LessThanOrEqual(query.fechaHasta);
    if (query.vencidas === 'true') {
      base.estadoPrestamo = EstadoPrestamoNota.ENTREGADO;
      base.fechaDevolucionEstimada = LessThan(
        new Date().toISOString().slice(0, 10),
      );
    }

    const where: FindOptionsWhere<PrestamosNota>[] = query.search
      ? [
          { ...base, numeroNotaSolicitud: ILike(`%${query.search}%`) },
          { ...base, referencia: ILike(`%${query.search}%`) },
          { ...base, institucionSolicitante: ILike(`%${query.search}%`) },
          { ...base, funcionarioResponsable: ILike(`%${query.search}%`) },
          {
            ...base,
            funcionario: { ci: ILike(`%${query.search}%`) },
          },
        ]
      : [base];

    const [data, total] = await this.repo.findAndCount({
      where,
      relations: RELATIONS,
      order: { id: query.order ?? 'DESC' },
      skip: paginationSkip(page, pageSize),
      take: pageSize,
    });

    return new PaginatedResponseDto(data, total, page, pageSize);
  }

  async findOne(id: number): Promise<PrestamosNota> {
    const prestamo = await this.repo.findOne({
      where: { id },
      relations: RELATIONS,
    });
    if (!prestamo)
      throw new NotFoundException('El préstamo por nota no existe');
    return prestamo;
  }

  async update(
    id: number,
    dto: UpdatePrestamosNotaDto,
  ): Promise<PrestamosNota> {
    const prestamo = await this.findOne(id);
    if (prestamo.estadoPrestamo === EstadoPrestamoNota.DEVUELTO) {
      throw new ConflictException(
        'No se puede modificar un préstamo ya devuelto',
      );
    }
    this.validarFechas(
      dto.fechaPrestamo ?? prestamo.fechaPrestamo,
      dto.fechaDevolucionEstimada ?? prestamo.fechaDevolucionEstimada,
    );

    const { funcionarioId, ...resto } = dto;
    const cambios: Record<string, unknown> = Object.fromEntries(
      Object.entries(resto).filter(([, valor]) => valor !== undefined),
    );
    if (funcionarioId !== undefined) {
      Object.assign(
        cambios,
        await this.datosFuncionario(
          this.dataSource.manager,
          funcionarioId,
          dto.institucionSolicitante,
        ),
      );
    }
    if (Object.keys(cambios).length > 0) {
      await this.repo.update(id, cambios);
    }
    return this.findOne(id);
  }

  /** Registra la devolución de una fila ya cargada (dentro de la transacción). */
  private async devolverFila(
    manager: EntityManager,
    prestamo: PrestamosNota,
    dto: DevolverPrestamosNotaDto,
    usuario?: Usuario,
  ) {
    if (prestamo.estadoPrestamo === EstadoPrestamoNota.DEVUELTO) {
      throw new ConflictException('El préstamo ya fue devuelto');
    }
    if (prestamo.estadoPrestamo === EstadoPrestamoNota.BORRADOR) {
      throw new ConflictException(
        'La nota está en borrador: apruébela antes de registrar la devolución',
      );
    }
    const fechaReal = dto.fechaDevolucionReal ?? hoy();
    if (prestamo.fechaPrestamo && fechaReal < prestamo.fechaPrestamo) {
      throw new BadRequestException(
        'La fecha de devolución no puede ser anterior a la fecha de préstamo',
      );
    }
    prestamo.estadoPrestamo = EstadoPrestamoNota.DEVUELTO;
    prestamo.fechaDevolucionReal = fechaReal;
    prestamo.condicionDevolucion = dto.condicion ?? 'CONFORME';
    if (dto.observaciones) prestamo.observacionesDevolucion = dto.observaciones;
    prestamo.recibidoPorId = usuario?.id ?? null;
    await manager.save(PrestamosNota, prestamo);

    await manager.update(ComprobantesC31, prestamo.comprobanteId, {
      estadoFisico: EstadoFisicoC31.ARCHIVADO,
    });
    await registrarCambioEstado(manager, {
      comprobanteId: prestamo.comprobanteId as number,
      estadoAnterior: EstadoFisicoC31.PRESTADO,
      estadoNuevo: EstadoFisicoC31.ARCHIVADO,
      origen: 'PRESTAMO',
      usuarioId: usuario?.id,
      referencia: `Nota ${prestamo.numeroNotaSolicitud}`,
      detalle:
        `Devuelto ${prestamo.condicionDevolucion === 'CON_NOVEDAD' ? 'con novedad' : 'conforme'}` +
        (dto.observaciones ? `: ${dto.observaciones}` : ''),
    });
  }

  /**
   * Devolución de UN comprobante. Si la nota todavía tiene otros comprobantes
   * pendientes se rechaza: la nota se devuelve completa (devolverNota).
   */
  async devolver(
    id: number,
    dto: DevolverPrestamosNotaDto,
    usuario?: Usuario,
  ): Promise<PrestamosNota> {
    return this.dataSource.transaction(async (manager) => {
      const prestamo = await manager.findOne(PrestamosNota, { where: { id } });
      if (!prestamo)
        throw new NotFoundException('El préstamo por nota no existe');
      const pendientes = await manager.count(PrestamosNota, {
        where: {
          numeroNotaSolicitud: prestamo.numeroNotaSolicitud,
          estadoPrestamo: EstadoPrestamoNota.ENTREGADO,
        },
      });
      if (pendientes > 1) {
        throw new ConflictException(
          'La nota tiene varios comprobantes pendientes: se devuelven todos juntos con "Devolver nota completa"',
        );
      }
      await this.devolverFila(manager, prestamo, dto, usuario);
      const completo = await manager.findOne(PrestamosNota, {
        where: { id },
        relations: RELATIONS,
      });
      if (!completo)
        throw new NotFoundException('El préstamo por nota no existe');
      return completo;
    });
  }

  /** Devuelve de una vez TODOS los comprobantes pendientes de la nota (todo o nada). */
  async devolverNota(
    numeroNota: string,
    dto: DevolverPrestamosNotaDto,
    usuario?: Usuario,
  ): Promise<PrestamosNota[]> {
    return this.dataSource.transaction(async (manager) => {
      const filas = await this.filasDeNota(manager, numeroNota);
      const pendientes = filas.filter(
        (f) => f.estadoPrestamo !== EstadoPrestamoNota.DEVUELTO,
      );
      if (pendientes.length === 0) {
        throw new ConflictException('La nota ya fue devuelta completa');
      }
      for (const fila of pendientes) {
        await this.devolverFila(manager, fila, dto, usuario);
      }
      return manager.find(PrestamosNota, {
        where: { numeroNotaSolicitud: numeroNota },
        relations: RELATIONS,
        order: { id: 'ASC' },
      });
    });
  }

  /** Descarta una nota que sigue en borrador (nada salió del archivo). */
  async descartarBorrador(numeroNota: string): Promise<{ eliminados: number }> {
    return this.dataSource.transaction(async (manager) => {
      const filas = await this.filasDeNota(manager, numeroNota);
      if (filas.some((f) => f.estadoPrestamo !== EstadoPrestamoNota.BORRADOR)) {
        throw new ConflictException(
          'Solo se pueden descartar notas en borrador',
        );
      }
      await manager.remove(PrestamosNota, filas);
      return { eliminados: filas.length };
    });
  }

  async remove(id: number): Promise<PrestamosNota> {
    const prestamo = await this.findOne(id);
    if (prestamo.estadoPrestamo === EstadoPrestamoNota.ENTREGADO) {
      throw new ConflictException(
        'No se puede eliminar un préstamo que aún no fue devuelto',
      );
    }
    return this.repo.remove(prestamo);
  }

  /** PDF de la nota de remisión: junta todos los comprobantes prestados con el mismo N° de nota. */
  async notaPdf(numeroNota: string, usuario: Usuario): Promise<Buffer> {
    const filas = await this.repo.find({
      where: { numeroNotaSolicitud: numeroNota },
      relations: {
        comprobante: {
          preventivos: true,
          devengados: true,
          beneficiarios: true,
        },
        registradoPor: true,
        funcionario: true,
      },
      order: { id: 'ASC' },
    });
    if (filas.length === 0) {
      throw new NotFoundException(`No existe la nota ${numeroNota}`);
    }
    const quien = filas[0]?.registradoPor ?? usuario;
    return generarNotaPrestamoPdf({
      filas,
      emisor: {
        nombre: quien?.nombreCompleto ?? usuario.nombreCompleto ?? '',
        cargo: quien?.cargo ?? usuario.cargo,
        unidad: quien?.unidadOArea ?? usuario.unidadOArea,
      },
    });
  }
}
