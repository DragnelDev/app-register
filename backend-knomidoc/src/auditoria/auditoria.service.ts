import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, ILike, Repository } from 'typeorm';
import { AuditoriaLog } from './entities/auditoria-log.entity';
import { FilterAuditoriaDto } from './dto/filter-auditoria.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { paginationSkip } from '../common/utils/pagination.util';

const CAMPOS_SENSIBLES = [
  'password',
  'passwordactual',
  'token',
  'accesstoken',
  'resetpasswordtoken',
];
const MAX_DETALLE = 4000;

/** Quita contraseñas/tokens (a cualquier profundidad) y limita el tamaño. */
export function sanitizarDetalle(
  valor: unknown,
): Record<string, unknown> | null {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null;

  const limpiar = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(limpiar);
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>).map(([k, val]) => [
          k,
          CAMPOS_SENSIBLES.includes(k.toLowerCase()) ? '***' : limpiar(val),
        ]),
      );
    }
    return v;
  };

  const limpio = limpiar(valor) as Record<string, unknown>;
  if (Object.keys(limpio).length === 0) return null;
  if (JSON.stringify(limpio).length > MAX_DETALLE) {
    return { _truncado: true, campos: Object.keys(limpio) };
  }
  return limpio;
}

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(
    @InjectRepository(AuditoriaLog)
    private readonly repo: Repository<AuditoriaLog>,
  ) {}

  /** Nunca debe romper la petición original: los fallos solo se registran en el log. */
  async registrar(datos: Partial<AuditoriaLog>): Promise<void> {
    try {
      await this.repo.save(this.repo.create(datos));
    } catch (error) {
      this.logger.error(
        `No se pudo registrar la auditoría: ${(error as Error).message}`,
      );
    }
  }

  async findAll(
    query: FilterAuditoriaDto,
  ): Promise<PaginatedResponseDto<AuditoriaLog>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const base: FindOptionsWhere<AuditoriaLog> = {};
    if (query.entidad) base.entidad = query.entidad;
    if (query.accion) base.accion = query.accion;
    if (query.usuarioId) base.usuarioId = query.usuarioId;
    if (query.fechaDesde || query.fechaHasta) {
      const desde = new Date(`${query.fechaDesde ?? '1970-01-01'}T00:00:00`);
      const hasta = new Date(
        `${query.fechaHasta ?? '2999-12-31'}T23:59:59.999`,
      );
      base.fecha = Between(desde, hasta);
    }

    const like = query.search ? `%${query.search}%` : undefined;
    const where: FindOptionsWhere<AuditoriaLog>[] = like
      ? [
          { ...base, usuarioNombre: ILike(like) },
          { ...base, ruta: ILike(like) },
          { ...base, registroId: ILike(like) },
        ]
      : [base];

    const [data, total] = await this.repo.findAndCount({
      where,
      order: { fecha: query.order ?? 'DESC', id: 'DESC' },
      skip: paginationSkip(page, pageSize),
      take: pageSize,
    });
    return new PaginatedResponseDto(data, total, page, pageSize);
  }

  /** Valores distintos para poblar los filtros del historial. */
  async findFiltros(): Promise<{ entidades: string[]; acciones: string[] }> {
    const [entidades, acciones] = await Promise.all([
      this.repo
        .createQueryBuilder('a')
        .select('DISTINCT a.entidad', 'valor')
        .orderBy('a.entidad', 'ASC')
        .getRawMany<{ valor: string }>(),
      this.repo
        .createQueryBuilder('a')
        .select('DISTINCT a.accion', 'valor')
        .orderBy('a.accion', 'ASC')
        .getRawMany<{ valor: string }>(),
    ]);
    return {
      entidades: entidades.map((e) => e.valor),
      acciones: acciones.map((a) => a.valor),
    };
  }
}
