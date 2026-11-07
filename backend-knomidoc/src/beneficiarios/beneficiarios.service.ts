import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Beneficiario } from './entities/beneficiario.entity';
import { CreateBeneficiarioDto } from './dto/create-beneficiario.dto';
import { UpdateBeneficiarioDto } from './dto/update-beneficiario.dto';
import { FilterBeneficiariosDto } from './dto/filter-beneficiarios.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { paginationSkip } from '../common/utils/pagination.util';
import { C31Beneficiario } from '../c31-beneficiarios/entities/c31-beneficiario.entity';
import { C31Pago } from '../c31-pagos/entities/c31-pago.entity';

const escaparLike = (t: string): string => t.replace(/[\\%_]/g, '\\$&');
/** Clave para comparar nombres sin importar mayúsculas ni espacios repetidos. */
export const claveNombre = (n: string): string =>
  n.trim().replace(/\s+/g, ' ').toUpperCase();

@Injectable()
export class BeneficiariosService {
  constructor(
    @InjectRepository(Beneficiario)
    private readonly repo: Repository<Beneficiario>,
    private readonly dataSource: DataSource,
  ) {}

  /** Con documento informado, no se repite el mismo tipo + número. */
  private async validarDocumentoUnico(
    tipo?: string,
    numero?: string | null,
    excluirId?: number,
  ) {
    if (!numero || !tipo || tipo === 'SIN_DOCUMENTO') return;
    const qb = this.repo
      .createQueryBuilder('b')
      .where('b.tipo_documento = :tipo', { tipo })
      .andWhere('UPPER(b.numero_documento) = UPPER(:numero)', { numero });
    if (excluirId) qb.andWhere('b.id <> :excluirId', { excluirId });
    if (await qb.getExists()) {
      throw new ConflictException(
        `Ya existe un beneficiario con ${tipo} ${numero}`,
      );
    }
  }

  async create(dto: CreateBeneficiarioDto, usuarioId?: number) {
    const tipoDocumento =
      dto.numeroDocumento && !dto.tipoDocumento
        ? 'CI'
        : (dto.tipoDocumento ?? 'SIN_DOCUMENTO');
    await this.validarDocumentoUnico(tipoDocumento, dto.numeroDocumento);
    return this.repo.save(
      this.repo.create({
        ...dto,
        nombre: claveNombre(dto.nombre as string),
        tipoPersona: (dto.tipoPersona as 'NATURAL' | 'JURIDICA') ?? 'NATURAL',
        tipoDocumento: tipoDocumento as 'CI',
        numeroDocumento: dto.numeroDocumento ?? null,
        estado: (dto.estado as 'ACTIVO') ?? 'ACTIVO',
        creadoPorId: usuarioId,
      }),
    );
  }

  /** Para autocompletar y listar: por nombre o documento, con filtros. */
  async findAll(query: FilterBeneficiariosDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const qb = this.repo.createQueryBuilder('b');

    if (query.tipoPersona)
      qb.andWhere('b.tipo_persona = :tp', { tp: query.tipoPersona });
    if (query.tipoDocumento)
      qb.andWhere('b.tipo_documento = :td', { td: query.tipoDocumento });
    if (query.estado)
      qb.andWhere('b.estado = :estado', { estado: query.estado });

    const texto = query.search?.trim();
    if (texto) {
      qb.andWhere(
        `(b.nombre ILIKE :like OR b.numero_documento ILIKE :like OR b.telefono ILIKE :like)`,
        { like: `%${escaparLike(texto)}%` },
      );
    }

    const gestion = query.gestion ? Number(query.gestion) : undefined;
    if (gestion || query.conComprobantes) {
      const filtroGestion = gestion ? 'AND c.gestion = :gestion' : '';
      const existe = `EXISTS (SELECT 1 FROM c31_beneficiarios cb
          JOIN comprobantes_c31 c ON c.id = cb.comprobante_id AND c.fecha_eliminacion IS NULL
          WHERE cb.beneficiario_id = b.id ${filtroGestion})`;
      qb.andWhere(
        query.conComprobantes === 'false' ? `NOT ${existe}` : existe,
        gestion ? { gestion } : {},
      );
    }

    qb.orderBy('b.nombre', 'ASC')
      .skip(paginationSkip(page, pageSize))
      .take(pageSize);
    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResponseDto(data, total, page, pageSize);
  }

  async findOne(id: number) {
    const b = await this.repo.findOne({ where: { id } });
    if (!b) throw new NotFoundException('El beneficiario no existe');
    return b;
  }

  async update(id: number, dto: UpdateBeneficiarioDto) {
    const b = await this.findOne(id);
    const tipo = dto.tipoDocumento ?? b.tipoDocumento;
    const numero =
      dto.numeroDocumento !== undefined
        ? dto.numeroDocumento
        : b.numeroDocumento;
    await this.validarDocumentoUnico(tipo, numero, id);
    Object.assign(b, dto);
    if (dto.nombre) b.nombre = claveNombre(dto.nombre);
    const guardado = await this.repo.save(b);
    // El nombre de los C31 ya registrados se mantiene tal como se registró
    return guardado;
  }

  /** Ficha: sus comprobantes, montos y pagos, por gestión. */
  async ficha(id: number) {
    const b = await this.findOne(id);
    const m = this.dataSource.manager;
    const comprobantes = await m
      .createQueryBuilder(C31Beneficiario, 'cb')
      .innerJoinAndSelect('cb.comprobante', 'c')
      .leftJoinAndSelect('c.preventivos', 'pv')
      .leftJoinAndSelect('c.devengados', 'dv')
      .where('cb.beneficiario_id = :id', { id })
      .orderBy('c.gestion', 'DESC')
      .addOrderBy('c.id', 'DESC')
      .take(200)
      .getMany();
    const pagos = await m
      .createQueryBuilder(C31Pago, 'p')
      .innerJoin('p.beneficiario', 'cb')
      .where('cb.beneficiario_id = :id', { id })
      .select('COALESCE(SUM(p.monto), 0)', 'total')
      .addSelect('COUNT(*)', 'cantidad')
      .getRawOne<{ total: string; cantidad: string }>();

    const porGestion = new Map<number, { cantidad: number; monto: number }>();
    for (const cb of comprobantes) {
      const c = cb.comprobante;
      if (!c) continue;
      const g = porGestion.get(c.gestion as number) ?? {
        cantidad: 0,
        monto: 0,
      };
      g.cantidad += 1;
      g.monto += Number(c.montoTotal ?? 0);
      porGestion.set(c.gestion as number, g);
    }
    return {
      beneficiario: b,
      resumen: {
        comprobantes: comprobantes.length,
        pagos: Number(pagos?.cantidad ?? 0),
        totalPagado: Number(pagos?.total ?? 0),
      },
      porGestion: [...porGestion.entries()]
        .map(([gestion, v]) => ({ gestion, ...v }))
        .sort((a, b2) => b2.gestion - a.gestion),
      comprobantes: comprobantes.map((cb) => ({
        id: cb.comprobante?.id,
        gestion: cb.comprobante?.gestion,
        tipoC31: cb.comprobante?.tipoC31,
        preventivos: cb.comprobante?.preventivos,
        devengados: cb.comprobante?.devengados,
        montoTotal: cb.comprobante?.montoTotal,
        estadoFisico: cb.comprobante?.estadoFisico,
        descripcion: cb.comprobante?.descripcion,
      })),
    };
  }

  /** Solo se elimina si nunca figuró en un C31; si no, se desactiva. */
  async remove(id: number) {
    const b = await this.findOne(id);
    const usos = await this.dataSource.manager.countBy(C31Beneficiario, {
      beneficiarioId: id,
    });
    if (usos > 0) {
      throw new ConflictException(
        'El beneficiario figura en comprobantes: no se puede eliminar, márquelo como Inactivo',
      );
    }
    return this.repo.softRemove(b);
  }

  // ───────────────── Integración con los C31 ─────────────────

  /** Nombres del catálogo para los ids indicados (en el mismo orden). */
  async nombresDe(ids: number[], manager?: EntityManager): Promise<string[]> {
    if (ids.length === 0) return [];
    const m = manager ?? this.dataSource.manager;
    const filas = await m
      .createQueryBuilder(Beneficiario, 'b')
      .where('b.id IN (:...ids)', { ids })
      .getMany();
    const porId = new Map(
      filas.map((f) => [f.id as number, f.nombre as string]),
    );
    const faltan = ids.filter((i) => !porId.has(i));
    if (faltan.length > 0) {
      throw new NotFoundException(
        `Beneficiario(s) inexistente(s): ${faltan.join(', ')}`,
      );
    }
    return ids.map((i) => porId.get(i) as string);
  }

  /**
   * Devuelve el id del catálogo de cada nombre; si no existe lo da de alta
   * (sin documento, para completarlo después desde el módulo).
   */
  async catalogar(
    manager: EntityManager,
    nombres: string[],
    usuarioId?: number,
  ): Promise<Map<string, number>> {
    const resultado = new Map<string, number>();
    for (const nombre of nombres) {
      const clave = claveNombre(nombre);
      if (resultado.has(clave)) continue;
      const existente = await manager
        .createQueryBuilder(Beneficiario, 'b')
        .where(
          "UPPER(REGEXP_REPLACE(TRIM(b.nombre), '\\s+', ' ', 'g')) = :clave",
          { clave },
        )
        .orderBy('b.id', 'ASC')
        .getOne();
      if (existente) {
        resultado.set(clave, existente.id as number);
        continue;
      }
      const nuevo = await manager.save(
        Beneficiario,
        manager.create(Beneficiario, {
          nombre: clave,
          tipoPersona: 'NATURAL',
          tipoDocumento: 'SIN_DOCUMENTO',
          estado: 'ACTIVO',
          creadoPorId: usuarioId,
        }),
      );
      resultado.set(clave, nuevo.id as number);
    }
    return resultado;
  }
}
