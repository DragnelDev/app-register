import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, Like, Repository } from 'typeorm';
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
import { registrarCambioEstado } from '../c31-historial/c31-historial.helper';

const RELATIONS = {
  comprobante: { preventivos: true, devengados: true, beneficiarios: true },
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

  /** Registra un préstamo por cada comprobante indicado (todos con los datos de la nota). */
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
      const comprobantes = await manager.findBy(ComprobantesC31, {
        id: In(comprobanteIds),
      });
      const porId = new Map(comprobantes.map((c) => [c.id, c]));

      for (const id of comprobanteIds) {
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

      const prestamos = comprobanteIds.map((comprobanteId) =>
        manager.create(PrestamosNota, {
          comprobanteId,
          numeroNotaSolicitud: dto.numeroNotaSolicitud,
          institucionSolicitante: dto.institucionSolicitante,
          funcionarioResponsable: dto.funcionarioResponsable,
          fechaPrestamo,
          fechaDevolucionEstimada: dto.fechaDevolucionEstimada,
          estadoPrestamo: EstadoPrestamoNota.ENTREGADO,
          observaciones: dto.observaciones,
          registradoPorId: usuario?.id ?? null,
        }),
      );
      const guardados = await manager.save(PrestamosNota, prestamos);

      await manager.update(
        ComprobantesC31,
        { id: In(comprobanteIds) },
        { estadoFisico: EstadoFisicoC31.PRESTADO },
      );
      for (const comprobanteId of comprobanteIds) {
        await registrarCambioEstado(manager, {
          comprobanteId,
          estadoAnterior: EstadoFisicoC31.ARCHIVADO,
          estadoNuevo: EstadoFisicoC31.PRESTADO,
          origen: 'PRESTAMO',
          usuarioId: usuario?.id,
          referencia: `Nota ${dto.numeroNotaSolicitud}`,
          detalle: `Préstamo a ${dto.institucionSolicitante} (recibe ${dto.funcionarioResponsable})`,
        });
      }

      return manager.find(PrestamosNota, {
        where: { id: In(guardados.map((p) => p.id as number)) },
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

    const where: FindOptionsWhere<PrestamosNota>[] = query.search
      ? [
          { ...base, numeroNotaSolicitud: Like(`%${query.search}%`) },
          { ...base, institucionSolicitante: Like(`%${query.search}%`) },
          { ...base, funcionarioResponsable: Like(`%${query.search}%`) },
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

    const cambios = Object.fromEntries(
      Object.entries(dto).filter(([, valor]) => valor !== undefined),
    );
    if (Object.keys(cambios).length > 0) {
      await this.repo.update(id, cambios);
    }
    return this.findOne(id);
  }

  /** RF-03.3: registra la devolución del comprobante prestado por nota. */
  async devolver(
    id: number,
    dto: DevolverPrestamosNotaDto,
    usuario?: Usuario,
  ): Promise<PrestamosNota> {
    return this.dataSource.transaction(async (manager) => {
      const prestamo = await manager.findOne(PrestamosNota, { where: { id } });
      if (!prestamo)
        throw new NotFoundException('El préstamo por nota no existe');
      if (prestamo.estadoPrestamo === EstadoPrestamoNota.DEVUELTO) {
        throw new ConflictException('El préstamo ya fue devuelto');
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
      if (dto.observaciones)
        prestamo.observacionesDevolucion = dto.observaciones;
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

      const completo = await manager.findOne(PrestamosNota, {
        where: { id },
        relations: RELATIONS,
      });
      if (!completo)
        throw new NotFoundException('El préstamo por nota no existe');
      return completo;
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
