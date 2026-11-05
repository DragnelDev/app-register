import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  EstadoGestion,
  ParametroGestion,
} from './entities/parametro-gestion.entity';
import {
  CreateParametroGestionDto,
  UpdateParametroGestionDto,
} from './dto/parametro-gestion.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { ComprobantesC31 } from '../comprobantes_c31/entities/comprobantes_c31.entity';

export interface ParametroGestionConConteo extends ParametroGestion {
  totalComprobantes: number;
}

@Injectable()
export class ParametrosGestionService {
  constructor(
    @InjectRepository(ParametroGestion)
    private readonly repo: Repository<ParametroGestion>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    dto: CreateParametroGestionDto,
    usuario: Usuario,
  ): Promise<ParametroGestion> {
    const existente = await this.repo.count({
      where: { gestion: dto.gestion },
      withDeleted: true,
    });
    if (existente > 0) {
      throw new ConflictException(
        `La gestión ${dto.gestion} ya está registrada`,
      );
    }
    const hayActiva = await this.repo.countBy({ activa: true });
    return this.repo.save(
      this.repo.create({
        ...dto,
        fechaApertura: dto.fechaApertura ?? `${dto.gestion}-01-01`,
        estado: EstadoGestion.ABIERTA,
        // La primera gestión que se registra queda activa automáticamente
        activa: hayActiva === 0,
        creadoPorId: usuario.id,
      }),
    );
  }

  /** Gestiones con la cantidad de comprobantes registrados en cada una. */
  async findAll(): Promise<ParametroGestionConConteo[]> {
    const gestiones = await this.repo.find({ order: { gestion: 'DESC' } });
    const filas = await this.dataSource
      .getRepository(ComprobantesC31)
      .createQueryBuilder('c')
      .select('c.gestion', 'gestion')
      .addSelect('COUNT(*)', 'total')
      .groupBy('c.gestion')
      .getRawMany<{ gestion: number; total: string }>();
    const conteo = new Map(
      filas.map((f) => [Number(f.gestion), Number(f.total)]),
    );
    return gestiones.map((g) =>
      Object.assign(g, {
        totalComprobantes: conteo.get(g.gestion as number) ?? 0,
      }),
    );
  }

  /** Gestión activa; si no hay ninguna configurada, devuelve null. */
  findActiva(): Promise<ParametroGestion | null> {
    return this.repo.findOneBy({ activa: true });
  }

  async findOne(id: number): Promise<ParametroGestion> {
    const gestion = await this.repo.findOneBy({ id });
    if (!gestion) throw new NotFoundException('La gestión no existe');
    return gestion;
  }

  async update(
    id: number,
    dto: UpdateParametroGestionDto,
  ): Promise<ParametroGestion> {
    const gestion = await this.findOne(id);
    if (dto.gestion !== undefined && dto.gestion !== gestion.gestion) {
      throw new ConflictException(
        'El año de una gestión registrada no puede modificarse',
      );
    }
    const { gestion: _g, ...resto } = dto;
    void _g;
    Object.assign(gestion, resto);
    return this.repo.save(gestion);
  }

  /** Marca una gestión como activa y desmarca las demás (transaccional). */
  async activar(id: number): Promise<ParametroGestion> {
    const gestion = await this.findOne(id);
    if (gestion.estado === EstadoGestion.CERRADA) {
      throw new ConflictException(
        'No se puede activar una gestión cerrada; reábrala primero',
      );
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        ParametroGestion,
        { activa: true },
        { activa: false },
      );
      await manager.update(ParametroGestion, id, { activa: true });
    });
    return this.findOne(id);
  }

  async cerrar(id: number): Promise<ParametroGestion> {
    const gestion = await this.findOne(id);
    if (gestion.activa) {
      throw new ConflictException(
        'No se puede cerrar la gestión activa; active otra gestión antes',
      );
    }
    gestion.estado = EstadoGestion.CERRADA;
    gestion.fechaCierre = new Date().toISOString().slice(0, 10);
    return this.repo.save(gestion);
  }

  async reabrir(id: number): Promise<ParametroGestion> {
    const gestion = await this.findOne(id);
    gestion.estado = EstadoGestion.ABIERTA;
    gestion.fechaCierre = null;
    return this.repo.save(gestion);
  }

  async remove(id: number): Promise<ParametroGestion> {
    const gestion = await this.findOne(id);
    const usados = await this.dataSource
      .getRepository(ComprobantesC31)
      .countBy({ gestion: gestion.gestion });
    if (usados > 0) {
      throw new ConflictException(
        'No se puede eliminar una gestión que tiene comprobantes registrados',
      );
    }
    if (gestion.activa) {
      throw new ConflictException('No se puede eliminar la gestión activa');
    }
    return this.repo.softRemove(gestion);
  }
}
