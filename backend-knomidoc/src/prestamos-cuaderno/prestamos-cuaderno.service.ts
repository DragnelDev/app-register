import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, Like, Repository } from 'typeorm';
import { CreatePrestamosCuadernoDto } from './dto/create-prestamos-cuaderno.dto';
import { UpdatePrestamosCuadernoDto } from './dto/update-prestamos-cuaderno.dto';
import { DevolverPrestamosCuadernoDto } from './dto/devolver-prestamos-cuaderno.dto';
import { FilterPrestamosCuadernoDto } from './dto/filter-prestamos-cuaderno.dto';
import {
  MetodoVerificacion,
  PrestamosCuaderno,
} from './entities/prestamos-cuaderno.entity';
import {
  ComprobantesC31,
  ESTADO_FISICO_LABELS,
  EstadoFisicoC31,
} from '../comprobantes_c31/entities/comprobantes_c31.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { paginationSkip } from '../common/utils/pagination.util';
import { registrarCambioEstado } from '../c31-historial/c31-historial.helper';

const RELATIONS = {
  comprobante: { preventivos: true, devengados: true, beneficiarios: true },
  solicitante: true,
  registradoPor: true,
  recibidoPor: true,
};

@Injectable()
export class PrestamosCuadernoService {
  constructor(
    @InjectRepository(PrestamosCuaderno)
    private readonly repo: Repository<PrestamosCuaderno>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    dto: CreatePrestamosCuadernoDto,
    usuario?: Usuario,
  ): Promise<PrestamosCuaderno[]> {
    const ids = [...new Set(dto.comprobanteIds)];
    return this.dataSource.transaction(async (manager) => {
      const solicitante = await manager.findOne(Usuario, {
        where: { id: dto.solicitanteId },
      });
      if (!solicitante) {
        throw new NotFoundException('El usuario solicitante no existe');
      }
      if (solicitante.activo === false) {
        throw new BadRequestException('El usuario solicitante está inactivo');
      }
      const areaUnidad = dto.areaUnidad ?? solicitante.unidadOArea;
      if (!areaUnidad) {
        throw new BadRequestException(
          'Indique el área o unidad del solicitante (su usuario no la tiene registrada)',
        );
      }
      const salida = dto.fechaHoraSalida
        ? new Date(dto.fechaHoraSalida)
        : new Date();
      if (
        dto.fechaDevolucionEstimada &&
        dto.fechaDevolucionEstimada < salida.toISOString().slice(0, 10)
      ) {
        throw new BadRequestException(
          'La devolución estimada no puede ser anterior a la salida',
        );
      }

      const comprobantes = await manager.find(ComprobantesC31, {
        where: { id: In(ids) },
        relations: { preventivos: true, devengados: true },
      });
      const creados: number[] = [];

      for (const id of ids) {
        const comprobante = comprobantes.find((c) => c.id === id);
        if (!comprobante) {
          throw new NotFoundException(`El comprobante ${id} no existe`);
        }
        const nombre =
          comprobante.preventivos?.[0]?.numeroPreventivo ??
          comprobante.devengados?.[0]?.numeroDevengado ??
          `#${id}`;
        if (comprobante.estadoFisico === EstadoFisicoC31.PRESTADO) {
          throw new ConflictException(
            `El comprobante ${nombre} ya se encuentra prestado`,
          );
        }
        if (comprobante.estadoFisico !== EstadoFisicoC31.ARCHIVADO) {
          throw new ConflictException(
            `El comprobante ${nombre} no puede prestarse: solo se prestan comprobantes archivados correctamente (estado actual: ${ESTADO_FISICO_LABELS[comprobante.estadoFisico as EstadoFisicoC31]})`,
          );
        }

        const guardado = await manager.save(
          PrestamosCuaderno,
          manager.create(PrestamosCuaderno, {
            comprobanteId: id,
            solicitanteId: dto.solicitanteId,
            areaUnidad,
            fechaHoraSalida: salida,
            fechaDevolucionEstimada: dto.fechaDevolucionEstimada,
            registradoPorId: usuario?.id ?? null,
            devuelto: false,
            metodoVerificacion:
              (dto.metodoVerificacion as MetodoVerificacion) ??
              MetodoVerificacion.FIRMA_MANUAL,
            evidenciaVerificacionUrl: dto.evidenciaVerificacionUrl,
            observaciones: dto.observaciones,
          }),
        );
        creados.push(guardado.id as number);

        await manager.update(ComprobantesC31, id, {
          estadoFisico: EstadoFisicoC31.PRESTADO,
        });
        await registrarCambioEstado(manager, {
          comprobanteId: id,
          estadoAnterior: EstadoFisicoC31.ARCHIVADO,
          estadoNuevo: EstadoFisicoC31.PRESTADO,
          origen: 'PRESTAMO',
          usuarioId: usuario?.id,
          referencia: 'Cuaderno de salida',
          detalle: `Salida a ${solicitante.nombreCompleto} (${areaUnidad})`,
        });
      }

      return manager.find(PrestamosCuaderno, {
        where: { id: In(creados) },
        relations: RELATIONS,
        order: { id: 'ASC' },
      });
    });
  }

  async findAll(
    query: FilterPrestamosCuadernoDto,
  ): Promise<PaginatedResponseDto<PrestamosCuaderno>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const base: FindOptionsWhere<PrestamosCuaderno> = {};
    if (query.devuelto !== undefined) base.devuelto = query.devuelto;
    if (query.comprobanteId) base.comprobanteId = query.comprobanteId;
    if (query.solicitanteId) base.solicitanteId = query.solicitanteId;

    const where: FindOptionsWhere<PrestamosCuaderno>[] = query.search
      ? [
          { ...base, areaUnidad: Like(`%${query.search}%`) },
          {
            ...base,
            solicitante: { nombreCompleto: Like(`%${query.search}%`) },
          },
        ]
      : [base];

    const [data, total] = await this.repo.findAndCount({
      where,
      relations: RELATIONS,
      order: { fechaHoraSalida: query.order ?? 'DESC' },
      skip: paginationSkip(page, pageSize),
      take: pageSize,
    });

    return new PaginatedResponseDto(data, total, page, pageSize);
  }

  async findOne(id: number): Promise<PrestamosCuaderno> {
    const prestamo = await this.repo.findOne({
      where: { id },
      relations: RELATIONS,
    });
    if (!prestamo) throw new NotFoundException('El préstamo no existe');
    return prestamo;
  }

  async update(
    id: number,
    dto: UpdatePrestamosCuadernoDto,
  ): Promise<PrestamosCuaderno> {
    const prestamo = await this.findOne(id);
    if (prestamo.devuelto) {
      throw new ConflictException(
        'No se puede modificar un préstamo ya devuelto',
      );
    }

    if (dto.solicitanteId !== undefined) {
      const existe = await this.dataSource.manager.existsBy(Usuario, {
        id: dto.solicitanteId,
      });
      if (!existe)
        throw new NotFoundException('El usuario solicitante no existe');
    }

    const cambios: Record<string, unknown> = {};
    if (dto.solicitanteId !== undefined)
      cambios.solicitanteId = dto.solicitanteId;
    if (dto.areaUnidad !== undefined) cambios.areaUnidad = dto.areaUnidad;
    if (dto.fechaHoraSalida !== undefined)
      cambios.fechaHoraSalida = new Date(dto.fechaHoraSalida);
    if (dto.fechaDevolucionEstimada !== undefined)
      cambios.fechaDevolucionEstimada = dto.fechaDevolucionEstimada;
    if (dto.metodoVerificacion !== undefined)
      cambios.metodoVerificacion = dto.metodoVerificacion;
    if (dto.evidenciaVerificacionUrl !== undefined)
      cambios.evidenciaVerificacionUrl = dto.evidenciaVerificacionUrl;
    if (dto.observaciones !== undefined)
      cambios.observaciones = dto.observaciones;

    if (Object.keys(cambios).length > 0) {
      await this.repo.update(id, cambios);
    }
    return this.findOne(id);
  }

  /** RF-03.3: registro de devolución */
  async devolver(
    id: number,
    dto: DevolverPrestamosCuadernoDto,
    usuario?: Usuario,
  ): Promise<PrestamosCuaderno> {
    return this.dataSource.transaction(async (manager) => {
      const prestamo = await manager.findOne(PrestamosCuaderno, {
        where: { id },
      });
      if (!prestamo) throw new NotFoundException('El préstamo no existe');
      if (prestamo.devuelto) {
        throw new ConflictException('El préstamo ya fue devuelto');
      }

      const fechaHoraDevolucion = dto.fechaHoraDevolucion
        ? new Date(dto.fechaHoraDevolucion)
        : new Date();
      if (
        prestamo.fechaHoraSalida &&
        fechaHoraDevolucion < prestamo.fechaHoraSalida
      ) {
        throw new BadRequestException(
          'La devolución no puede ser anterior a la salida',
        );
      }

      prestamo.devuelto = true;
      prestamo.fechaHoraDevolucion = fechaHoraDevolucion;
      prestamo.condicionDevolucion = dto.condicion ?? 'CONFORME';
      if (dto.observaciones)
        prestamo.observacionesDevolucion = dto.observaciones;
      prestamo.recibidoPorId = usuario?.id ?? null;
      await manager.save(PrestamosCuaderno, prestamo);

      await manager.update(ComprobantesC31, prestamo.comprobanteId, {
        estadoFisico: EstadoFisicoC31.ARCHIVADO,
      });
      await registrarCambioEstado(manager, {
        comprobanteId: prestamo.comprobanteId as number,
        estadoAnterior: EstadoFisicoC31.PRESTADO,
        estadoNuevo: EstadoFisicoC31.ARCHIVADO,
        origen: 'PRESTAMO',
        usuarioId: usuario?.id,
        referencia: 'Cuaderno de salida',
        detalle:
          `Devuelto ${prestamo.condicionDevolucion === 'CON_NOVEDAD' ? 'con novedad' : 'conforme'}` +
          (dto.observaciones ? `: ${dto.observaciones}` : ''),
      });

      const completo = await manager.findOne(PrestamosCuaderno, {
        where: { id },
        relations: RELATIONS,
      });
      if (!completo) throw new NotFoundException('El préstamo no existe');
      return completo;
    });
  }

  async remove(id: number): Promise<PrestamosCuaderno> {
    const prestamo = await this.findOne(id);
    if (!prestamo.devuelto) {
      throw new ConflictException(
        'No se puede eliminar un préstamo que aún no fue devuelto',
      );
    }
    return this.repo.remove(prestamo);
  }
}
