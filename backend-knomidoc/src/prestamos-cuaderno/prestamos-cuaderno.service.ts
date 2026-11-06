import { identificadorC31 } from '../common/utils/identificador-c31.util';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import {
  DataSource,
  EntityManager,
  In,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
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
import {
  EstadoFuncionario,
  Funcionario,
} from '../funcionarios/entities/funcionario.entity';
import { generarReporteCuadernoPdf } from './cuaderno-pdf.util';
import { registrarCambioEstado } from '../c31-historial/c31-historial.helper';

const RELATIONS = {
  comprobante: { preventivos: true, devengados: true, beneficiarios: true },
  funcionario: true,
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
      const funcionario = await manager.findOne(Funcionario, {
        where: { id: dto.funcionarioId },
      });
      if (!funcionario) {
        throw new NotFoundException('El funcionario solicitante no existe');
      }
      if (funcionario.estado === EstadoFuncionario.INACTIVO) {
        throw new BadRequestException(
          'El funcionario solicitante está inactivo',
        );
      }
      const areaUnidad =
        dto.areaUnidad ?? (funcionario.unidadOficina as string);
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
      const loteId = randomUUID();

      for (const id of ids) {
        const comprobante = comprobantes.find((c) => c.id === id);
        if (!comprobante) {
          throw new NotFoundException(`El comprobante ${id} no existe`);
        }
        const nombre = identificadorC31(comprobante, `#${id}`);
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
            loteId,
            funcionarioId: dto.funcionarioId,
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
          detalle: `Salida a ${funcionario.nombres} ${funcionario.apellidos} (${areaUnidad})`,
        });
      }

      return manager.find(PrestamosCuaderno, {
        where: { id: In(creados) },
        relations: RELATIONS,
        order: { id: 'ASC' },
      });
    });
  }

  /** Consulta base con todos los filtros (la usan el listado y el reporte PDF). */
  private consulta(
    query: FilterPrestamosCuadernoDto,
  ): SelectQueryBuilder<PrestamosCuaderno> {
    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.comprobante', 'c')
      .leftJoinAndSelect('c.preventivos', 'prev')
      .leftJoinAndSelect('c.devengados', 'dev')
      .leftJoinAndSelect('c.beneficiarios', 'ben')
      .leftJoinAndSelect('p.funcionario', 'f')
      .leftJoinAndSelect('p.solicitante', 'sol')
      .leftJoinAndSelect('p.registradoPor', 'reg')
      .leftJoinAndSelect('p.recibidoPor', 'rec');

    if (query.devuelto !== undefined)
      qb.andWhere('p.devuelto = :devuelto', { devuelto: query.devuelto });
    // Estado: PENDIENTE (aún no devuelto, incluye vencidos), VENCIDO (pendiente con
    // fecha estimada pasada) o DEVUELTO
    if (query.estado === 'DEVUELTO') qb.andWhere('p.devuelto = true');
    if (query.estado === 'PENDIENTE') qb.andWhere('p.devuelto = false');
    if (query.estado === 'VENCIDO')
      qb.andWhere('p.devuelto = false').andWhere(
        'p.fechaDevolucionEstimada < CURRENT_DATE',
      );
    if (query.comprobanteId)
      qb.andWhere('p.comprobanteId = :comprobanteId', {
        comprobanteId: query.comprobanteId,
      });
    if (query.funcionarioId)
      qb.andWhere('p.funcionarioId = :funcionarioId', {
        funcionarioId: query.funcionarioId,
      });
    // Gestión fiscal del comprobante (los N° de preventivo se repiten entre gestiones)
    if (query.gestion)
      qb.andWhere('c.gestion = :gestion', { gestion: query.gestion });
    if (query.fechaDesde)
      qb.andWhere('CAST(p.fechaHoraSalida AS date) >= :desde', {
        desde: query.fechaDesde,
      });
    if (query.fechaHasta)
      qb.andWhere('CAST(p.fechaHoraSalida AS date) <= :hasta', {
        hasta: query.fechaHasta,
      });
    if (query.unidad?.trim())
      qb.andWhere('p.areaUnidad ILIKE :unidad', {
        unidad: `%${query.unidad.trim()}%`,
      });
    if (query.search?.trim()) {
      qb.andWhere(
        `(p.areaUnidad ILIKE :like
          OR f.nombres ILIKE :like
          OR f.apellidos ILIKE :like
          OR f.ci ILIKE :like
          OR sol.nombreCompleto ILIKE :like)`,
        { like: `%${query.search.trim()}%` },
      );
    }
    return qb;
  }

  async findAll(
    query: FilterPrestamosCuadernoDto,
  ): Promise<PaginatedResponseDto<PrestamosCuaderno>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const [data, total] = await this.consulta(query)
      .orderBy('p.fechaHoraSalida', query.order ?? 'DESC')
      .addOrderBy('p.id', 'DESC')
      .skip(paginationSkip(page, pageSize))
      .take(pageSize)
      .getManyAndCount();

    return new PaginatedResponseDto(data, total, page, pageSize);
  }

  /** Planilla PDF con los mismos filtros del listado (sin paginar). */
  async reportePdf(
    query: FilterPrestamosCuadernoDto,
    usuario: Usuario,
  ): Promise<Buffer> {
    const filas = await this.consulta(query)
      .orderBy('p.fechaHoraSalida', 'ASC')
      .addOrderBy('p.id', 'ASC')
      .getMany();

    const filtros: string[] = [];
    if (query.gestion) filtros.push(`Gestión: ${query.gestion}`);
    if (query.fechaDesde || query.fechaHasta)
      filtros.push(
        `Salida: ${query.fechaDesde ?? '…'} a ${query.fechaHasta ?? '…'}`,
      );
    if (query.funcionarioId) {
      const f = await this.dataSource.manager.findOne(Funcionario, {
        where: { id: query.funcionarioId },
        withDeleted: true,
      });
      filtros.push(
        `Funcionario: ${f ? `${f.nombres} ${f.apellidos}` : `#${query.funcionarioId}`}`,
      );
    }
    if (query.unidad?.trim()) filtros.push(`Unidad: ${query.unidad.trim()}`);
    if (query.devuelto !== undefined)
      filtros.push(`Estado: ${query.devuelto ? 'Devuelto' : 'Pendiente'}`);
    if (query.estado)
      filtros.push(
        `Estado: ${{ PENDIENTE: 'Pendientes de devolución', VENCIDO: 'Vencidos', DEVUELTO: 'Devueltos' }[query.estado]}`,
      );

    return generarReporteCuadernoPdf({
      filas,
      filtros,
      emisor: usuario?.nombreCompleto ?? '',
    });
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

    if (dto.funcionarioId !== undefined) {
      const f = await this.dataSource.manager.findOne(Funcionario, {
        where: { id: dto.funcionarioId },
      });
      if (!f) throw new NotFoundException('El funcionario no existe');
      if (f.estado === EstadoFuncionario.INACTIVO)
        throw new BadRequestException('El funcionario está inactivo');
    }

    const cambios: Record<string, unknown> = {};
    if (dto.funcionarioId !== undefined)
      cambios.funcionarioId = dto.funcionarioId;
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

  /** Registra la devolución de una fila ya cargada (dentro de la transacción). */
  private async devolverFila(
    manager: EntityManager,
    prestamo: PrestamosCuaderno,
    dto: DevolverPrestamosCuadernoDto,
    usuario?: Usuario,
  ) {
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
    if (dto.observaciones) prestamo.observacionesDevolucion = dto.observaciones;
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
  }

  /**
   * RF-03.3: devolución de UN comprobante. Si pertenece a un lote con otros
   * pendientes se rechaza: el lote se devuelve completo (devolverLote).
   */
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
      if (prestamo.loteId) {
        const pendientes = await manager.count(PrestamosCuaderno, {
          where: { loteId: prestamo.loteId, devuelto: false },
        });
        if (pendientes > 1) {
          throw new ConflictException(
            'Este préstamo salió junto con otros comprobantes: se devuelven todos juntos con "Devolver lote"',
          );
        }
      }
      await this.devolverFila(manager, prestamo, dto, usuario);
      const completo = await manager.findOne(PrestamosCuaderno, {
        where: { id },
        relations: RELATIONS,
      });
      if (!completo) throw new NotFoundException('El préstamo no existe');
      return completo;
    });
  }

  /** Devuelve de una vez todos los comprobantes pendientes del lote (todo o nada). */
  async devolverLote(
    loteId: string,
    dto: DevolverPrestamosCuadernoDto,
    usuario?: Usuario,
  ): Promise<PrestamosCuaderno[]> {
    return this.dataSource.transaction(async (manager) => {
      const filas = await manager.find(PrestamosCuaderno, {
        where: { loteId },
        order: { id: 'ASC' },
      });
      if (filas.length === 0) throw new NotFoundException('El lote no existe');
      const pendientes = filas.filter((f) => !f.devuelto);
      if (pendientes.length === 0) {
        throw new ConflictException('El lote ya fue devuelto completo');
      }
      for (const fila of pendientes) {
        await this.devolverFila(manager, fila, dto, usuario);
      }
      return manager.find(PrestamosCuaderno, {
        where: { loteId },
        relations: RELATIONS,
        order: { id: 'ASC' },
      });
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
