import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PrestamosNota, EstadoPrestamoNota } from '../prestamos-nota/entities/prestamos-nota.entity';
import { EstadoFisicoC31 } from '../comprobantes_c31/entities/comprobantes_c31.entity';
import { devengadosDe, preventivosDe } from '../common/utils/identificador-c31.util';
import { NotaAuditoria } from './entities/nota-auditoria.entity';
import {
  CreateNotaAuditoriaDto,
  UpdateNotaAuditoriaDto,
} from './dto/nota-auditoria.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { notaAuditoriaPdf } from './nota-auditoria-pdf.util';

const hoy = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });

@Injectable()
export class NotasAuditoriaService {
  constructor(
    @InjectRepository(NotaAuditoria) private readonly repo: Repository<NotaAuditoria>,
    @InjectRepository(PrestamosNota) private readonly prestamos: Repository<PrestamosNota>,
  ) {}

  /** CITE correlativo por gestión: GAMSL/ARCH/AUD/OF-N° 004/2026 */
  private async siguienteCite(anio: number): Promise<string> {
    const prefijo = process.env.CITE_PREFIJO ?? 'GAMSL/ARCH';
    const filas = await this.repo
      .createQueryBuilder('n')
      .select('n.cite', 'cite')
      .where('n.cite LIKE :p', { p: `${prefijo}/AUD/OF-N° %/${anio}` })
      .getRawMany<{ cite: string }>();
    let max = 0;
    for (const f of filas) {
      const m = /OF-N° (\d+)\//.exec(f.cite);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return `${prefijo}/AUD/OF-N° ${String(max + 1).padStart(3, '0')}/${anio}`;
  }

  /** Notas de préstamo (agrupadas por N° de nota) para elegir a cuál responde la nota. */
  async notasPrestamo(search?: string) {
    const qb = this.prestamos
      .createQueryBuilder('p')
      .select('p.numeroNotaSolicitud', 'numero')
      .addSelect('MAX(p.fechaPrestamo)', 'fecha')
      .addSelect('MAX(p.institucionSolicitante)', 'institucion')
      .addSelect('MAX(p.funcionarioResponsable)', 'responsable')
      .addSelect('COUNT(*)', 'total')
      .groupBy('p.numeroNotaSolicitud')
      .orderBy('MAX(p.fechaPrestamo)', 'DESC')
      .limit(100);
    if (search?.trim())
      qb.where(
        '(p.numeroNotaSolicitud ILIKE :s OR p.institucionSolicitante ILIKE :s OR p.funcionarioResponsable ILIKE :s)',
        { s: `%${search.trim()}%` },
      );
    const filas = await qb.getRawMany<{
      numero: string; fecha: string; institucion: string | null;
      responsable: string | null; total: string;
    }>();
    return filas.map((f) => ({ ...f, total: Number(f.total) }));
  }

  /**
   * Arma las secciones de la nota según el estado actual de cada comprobante
   * de las notas de préstamo elegidas:
   *  - Entrega: salieron del archivo con la nota (préstamo ENTREGADO).
   *  - Pendientes: aún no están en archivo (en trámite, en revisión, observado)
   *    o la nota sigue en borrador, por lo que no pueden entregarse.
   *  - Entregados anteriormente: ya fueron devueltos al archivo.
   */
  async desdePrestamos(numeros: string[]) {
    if (!numeros.length) return null;
    const filas = await this.prestamos.find({
      where: { numeroNotaSolicitud: In(numeros) },
      relations: { comprobante: { preventivos: true, devengados: true } },
    });
    if (!filas.length) throw new NotFoundException('No hay préstamos con esas notas');

    const NO_EN_ARCHIVO: string[] = [
      EstadoFisicoC31.EN_TRAMITE,
      EstadoFisicoC31.EN_REVISION,
      EstadoFisicoC31.OBSERVADO,
    ];
    const entrega = new Set<string>();
    const pendientes = new Set<string>();
    const anteriores = new Set<string>();
    for (const f of filas) {
      const c = f.comprobante;
      if (!c) continue;
      const prev = preventivosDe(c).join('-');
      const dev = devengadosDe(c).join('-');
      const rotulo = prev || (dev ? `DEV ${dev}` : `C31 #${c.id}`);
      if (NO_EN_ARCHIVO.includes(c.estadoFisico as string) || f.estadoPrestamo === EstadoPrestamoNota.BORRADOR)
        pendientes.add(rotulo);
      else if (f.estadoPrestamo === EstadoPrestamoNota.DEVUELTO) anteriores.add(rotulo);
      else entrega.add(rotulo);
    }
    const orden = (a: string, b: string) => (parseInt(a.replace(/\D/g, '')) || 0) - (parseInt(b.replace(/\D/g, '')) || 0) || a.localeCompare(b);
    const lista = (s: Set<string>) => [...s].sort(orden);
    const primero = filas[0]!;
    const secciones = [
      {
        titulo: `Comprobantes entregados (${entrega.size})`,
        texto: 'En esta oportunidad se hace la entrega física de los comprobantes C-31, debidamente foliados y engrampados, según el siguiente detalle:',
        items: lista(entrega),
      },
      {
        titulo: `Comprobantes pendientes (${pendientes.size})`,
        texto: 'Los siguientes comprobantes aún no se encuentran en la Unidad de Archivo (en trámite o bajo custodia de otras oficinas), por lo que no es posible su entrega:',
        items: lista(pendientes),
      },
      {
        titulo: `Comprobantes entregados anteriormente (${anteriores.size})`,
        texto: 'Estos comprobantes ya fueron entregados anteriormente y devueltos al archivo, debidamente registrados en los cuadernos de cargo de la Unidad de Archivo:',
        items: lista(anteriores),
      },
    ].filter((s) => s.items.length > 0);
    return {
      notasPrestamo: numeros,
      destinatario: primero.funcionarioResponsable ?? '',
      institucion: primero.institucionSolicitante ?? '',
      referencia: `RESPUESTA A LA SOLICITUD DE DOCUMENTACIÓN (${numeros.map((n) => `NOTA ${n}`).join(', ')})`,
      secciones,
    };
  }

  async create(dto: CreateNotaAuditoriaDto, usuario: Usuario) {
    const fecha = dto.fecha ?? hoy();
    const cite = dto.cite?.trim() || (await this.siguienteCite(Number(fecha.slice(0, 4))));
    if (await this.repo.existsBy({ cite }))
      throw new ConflictException(`Ya existe una nota con el CITE ${cite}`);
    return this.repo.save(
      this.repo.create({
        ...dto,
        cite,
        fecha,
        introduccion: dto.introduccion ?? '',
        cierre: dto.cierre ?? '',
        secciones: dto.secciones ?? [],
        creadoPorId: usuario.id,
      }),
    );
  }

  findAll(search?: string) {
    const qb = this.repo.createQueryBuilder('n').orderBy('n.fecha', 'DESC').addOrderBy('n.id', 'DESC');
    if (search?.trim())
      qb.where('(n.cite ILIKE :s OR n.referencia ILIKE :s)', { s: `%${search.trim()}%` });
    return qb.take(200).getMany();
  }

  async findOne(id: number) {
    const n = await this.repo.findOneBy({ id });
    if (!n) throw new NotFoundException('Nota no encontrada');
    return n;
  }

  async update(id: number, dto: UpdateNotaAuditoriaDto) {
    const n = await this.findOne(id);
    if (dto.cite && dto.cite !== n.cite && (await this.repo.existsBy({ cite: dto.cite })))
      throw new ConflictException(`Ya existe una nota con el CITE ${dto.cite}`);
    Object.assign(n, dto);
    return this.repo.save(n);
  }

  async remove(id: number) {
    await this.repo.softRemove(await this.findOne(id));
  }

  async pdf(id: number) {
    return notaAuditoriaPdf(await this.findOne(id));
  }
}
