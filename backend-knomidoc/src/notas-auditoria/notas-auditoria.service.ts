import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ComprobantesC31 } from '../comprobantes_c31/entities/comprobantes_c31.entity';
import { C31Preventivo } from '../c31-preventivos/entities/c31-preventivo.entity';
import { C31Devengado } from '../c31-devengados/entities/c31-devengado.entity';
import {
  PrestamosNota,
  EstadoPrestamoNota,
} from '../prestamos-nota/entities/prestamos-nota.entity';
import { EstadoFisicoC31 } from '../comprobantes_c31/entities/comprobantes_c31.entity';
import {
  devengadosDe,
  preventivosDe,
} from '../common/utils/identificador-c31.util';
import { NotaAuditoria } from './entities/nota-auditoria.entity';
import {
  ClasificarDto,
  CreateNotaAuditoriaDto,
  UpdateNotaAuditoriaDto,
} from './dto/nota-auditoria.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { SolicitudAuditoria } from './entities/solicitud-auditoria.entity';
import {
  SolicitudAuditoriaDto,
  UpdateSolicitudAuditoriaDto,
} from './dto/nota-auditoria.dto';
import { CitesService } from '../cites/cites.service';
import { notaAuditoriaPdf } from './nota-auditoria-pdf.util';

const hoy = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });

@Injectable()
export class NotasAuditoriaService {
  constructor(
    @InjectRepository(NotaAuditoria)
    private readonly repo: Repository<NotaAuditoria>,
    @InjectRepository(PrestamosNota)
    private readonly prestamos: Repository<PrestamosNota>,
    @InjectRepository(SolicitudAuditoria)
    private readonly solicitudes: Repository<SolicitudAuditoria>,
    private readonly dataSource: DataSource,
    private readonly cites: CitesService,
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
      numero: string;
      fecha: string;
      institucion: string | null;
      responsable: string | null;
      total: string;
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
    if (!filas.length)
      throw new NotFoundException('No hay préstamos con esas notas');

    const NO_EN_ARCHIVO: string[] = [
      EstadoFisicoC31.EN_TRAMITE,
      EstadoFisicoC31.EN_REVISION,
      EstadoFisicoC31.OBSERVADO,
      EstadoFisicoC31.NO_ENCONTRADO,
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
      if (
        NO_EN_ARCHIVO.includes(c.estadoFisico as string) ||
        f.estadoPrestamo === EstadoPrestamoNota.BORRADOR
      )
        pendientes.add(rotulo);
      else if (f.estadoPrestamo === EstadoPrestamoNota.DEVUELTO)
        anteriores.add(rotulo);
      else entrega.add(rotulo);
    }
    const orden = (a: string, b: string) =>
      (parseInt(a.replace(/\D/g, '')) || 0) -
        (parseInt(b.replace(/\D/g, '')) || 0) || a.localeCompare(b);
    const lista = (s: Set<string>) => [...s].sort(orden);
    const primero = filas[0]!;
    const secciones = [
      {
        titulo: `Comprobantes entregados (${entrega.size})`,
        texto:
          'En esta oportunidad se hace la entrega física de los comprobantes C-31, debidamente foliados y engrampados, según el siguiente detalle:',
        items: lista(entrega),
      },
      {
        titulo: `Comprobantes pendientes (${pendientes.size})`,
        texto:
          'Los siguientes comprobantes aún no se encuentran en la Unidad de Archivo (en trámite o bajo custodia de otras oficinas), por lo que no es posible su entrega:',
        items: lista(pendientes),
      },
      {
        titulo: `Comprobantes entregados anteriormente (${anteriores.size})`,
        texto:
          'Estos comprobantes ya fueron entregados anteriormente y devueltos al archivo, debidamente registrados en los cuadernos de cargo de la Unidad de Archivo:',
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
    const cite =
      dto.cite?.trim() || (await this.siguienteCite(Number(fecha.slice(0, 4))));
    if (await this.repo.existsBy({ cite }))
      throw new ConflictException(`Ya existe una nota con el CITE ${cite}`);
    const { solicitudId, ...datos } = dto;
    const nota = await this.repo.save(
      this.repo.create({
        ...datos,
        cite,
        fecha,
        introduccion: dto.introduccion ?? '',
        cierre: dto.cierre ?? '',
        secciones: dto.secciones ?? [],
        creadoPorId: usuario.id,
      }),
    );
    if (solicitudId) {
      const sol = await this.solicitudes.findOneBy({ id: solicitudId });
      if (sol) {
        sol.estado = 'RESPONDIDA';
        sol.notaAuditoriaId = nota.id;
        await this.solicitudes.save(sol);
      }
    }
    // La nota queda también en el libro global de CITEs
    await this.cites
      .registrarSiNoExiste(
        {
          direccion: 'EMITIDO',
          tipo: 'AUD',
          cite: nota.cite,
          fecha: nota.fecha,
          contraparte: nota.destinatario?.nombre ?? '',
          cargoContraparte: nota.destinatario?.cargo,
          asunto: nota.referencia ?? '',
        },
        'NOTA_AUDITORIA',
        nota.id as number,
        usuario,
      )
      .catch(() => undefined);
    return nota;
  }

  findAll(search?: string) {
    const qb = this.repo
      .createQueryBuilder('n')
      .orderBy('n.fecha', 'DESC')
      .addOrderBy('n.id', 'DESC');
    if (search?.trim())
      qb.where('(n.cite ILIKE :s OR n.referencia ILIKE :s)', {
        s: `%${search.trim()}%`,
      });
    return qb.take(200).getMany();
  }

  async findOne(id: number) {
    const n = await this.repo.findOneBy({ id });
    if (!n) throw new NotFoundException('Nota no encontrada');
    return n;
  }

  async update(id: number, dto: UpdateNotaAuditoriaDto, usuario?: Usuario) {
    const n = await this.findOne(id);
    const { motivoModificacion, ...cambios } = dto;
    if (
      cambios.cite &&
      cambios.cite !== n.cite &&
      (await this.repo.existsBy({ cite: cambios.cite }))
    )
      throw new ConflictException(
        `Ya existe una nota con el CITE ${cambios.cite}`,
      );
    if (n.estado === 'EMITIDA') {
      const motivo = motivoModificacion?.trim() ?? '';
      if (motivo.length < 5)
        throw new BadRequestException(
          'La nota ya fue emitida: indique el motivo de la modificación (mínimo 5 caracteres)',
        );
      const campos = Object.keys(cambios).filter(
        (k) =>
          JSON.stringify((n as unknown as Record<string, unknown>)[k]) !==
          JSON.stringify((cambios as Record<string, unknown>)[k]),
      );
      n.historial = [
        ...(n.historial ?? []),
        {
          fecha: new Date().toISOString(),
          usuarioId: usuario?.id ?? null,
          usuario: usuario?.nombreCompleto ?? null,
          motivo,
          campos,
        },
      ];
    }
    Object.assign(n, cambios);
    return this.repo.save(n);
  }

  /** La nota se emite al imprimirla/firmarla: desde aquí solo se cambia con motivo. */
  async emitir(id: number) {
    const n = await this.findOne(id);
    if (n.estado === 'EMITIDA') return n;
    n.estado = 'EMITIDA';
    n.fechaEmision = new Date();
    return this.repo.save(n);
  }

  async remove(id: number, usuario?: Usuario) {
    const n = await this.findOne(id);
    if (
      n.estado === 'EMITIDA' &&
      (usuario?.rolActivo ?? usuario?.rol) !== 'ADMIN'
    )
      throw new ConflictException(
        'Una nota emitida no se elimina; solo el administrador puede hacerlo',
      );
    await this.repo.softRemove(n);
  }

  /**
   * Clasifica lo que pide Auditoría según el estado de cada comprobante. No guarda
   * nada: es una ayuda para armar la nota antes de verificar con lo físico.
   *  - entrega: Archivado correctamente (o En archivo, con aviso) y sin entrega previa.
   *  - anteriores: ya entregados antes por nota formal, o prestados.
   *  - pendientes: aún no están en el archivo (en trámite, firmado, observado, anulado).
   *  - noRegistrados: N° que no existen en el sistema (se tratan como pendientes).
   */
  async clasificar(dto: ClasificarDto) {
    const gestion = dto.gestion ?? new Date().getFullYear();
    const prev = new Set<number>();
    const dev = new Set<number>();
    let total = 0;
    for (const crudo of (dto.texto ?? '').split(/[\n,;]+/)) {
      let t = crudo.trim();
      if (!t) continue;
      const esDev = /^(dev|d)\b\.?\s*/i.test(t) || /^devengado\b/i.test(t);
      t = t.replace(/^(devengado|dev|preventivo|prev|d|p)\b\.?\s*/i, '');
      const m = /^(\d+)\s*(?:-\s*(\d+))?$/.exec(t);
      if (!m)
        throw new BadRequestException(
          `No se entiende «${crudo.trim()}». Use números o rangos: 1-120, 130`,
        );
      const a = Number(m[1]);
      const z = m[2] ? Number(m[2]) : a;
      const [lo, hi] = a <= z ? [a, z] : [z, a];
      if (hi - lo > 5000)
        throw new BadRequestException(`El rango ${t} es demasiado grande`);
      total += hi - lo + 1;
      if (total > 20000)
        throw new BadRequestException(
          'Demasiados números en una sola consulta',
        );
      for (let i = lo; i <= hi; i++) (esDev ? dev : prev).add(i);
    }

    const m = this.dataSource.manager;
    const ids = new Set<number>(dto.comprobanteIds ?? []);
    const buscar = async (
      ent: typeof C31Preventivo | typeof C31Devengado,
      campo: string,
      nums: Set<number>,
    ) => {
      const lista = [...nums].map(String);
      for (let i = 0; i < lista.length; i += 2000) {
        const filas = await m
          .createQueryBuilder(ent, 'x')
          .innerJoin('x.comprobante', 'c')
          .select('c.id', 'id')
          .where(`x.${campo} IN (:...n)`, { n: lista.slice(i, i + 2000) })
          .andWhere('c.gestion = :g', { g: gestion })
          .getRawMany<{ id: number }>();
        filas.forEach((f) => ids.add(Number(f.id)));
      }
    };
    if (prev.size) await buscar(C31Preventivo, 'numeroPreventivo', prev);
    if (dev.size) await buscar(C31Devengado, 'numeroDevengado', dev);

    const comps = ids.size
      ? await m.find(ComprobantesC31, {
          where: { id: In([...ids]) },
          relations: { preventivos: true, devengados: true },
        })
      : [];
    const previas = comps.length
      ? await this.prestamos.find({
          where: {
            comprobanteId: In(comps.map((c) => c.id as number)),
            estadoPrestamo: In([
              EstadoPrestamoNota.ENTREGADO,
              EstadoPrestamoNota.DEVUELTO,
            ]),
          },
          select: { comprobanteId: true },
        })
      : [];
    const conEntregaPrevia = new Set(previas.map((p) => p.comprobanteId));

    // N° pedidos que no existen en el sistema
    const hallados = { prev: new Set<number>(), dev: new Set<number>() };
    for (const c of comps) {
      preventivosDe(c).forEach((x) => hallados.prev.add(Number(x)));
      devengadosDe(c).forEach((x) => hallados.dev.add(Number(x)));
    }
    const faltan = (pedidos: Set<number>, hay: Set<number>, pref: string) =>
      [...pedidos]
        .filter((n) => !hay.has(n))
        .sort((a, b) => a - b)
        .map((n) => `${pref}${n}`);
    const noRegistrados = [
      ...faltan(prev, hallados.prev, ''),
      ...faltan(dev, hallados.dev, 'DEV '),
    ];

    type Bucket = 'entrega' | 'anteriores' | 'pendientes';
    const items = comps
      .map((c) => {
        const estado = c.estadoFisico as string;
        let bucket: Bucket;
        let motivo: string;
        if (estado === EstadoFisicoC31.ARCHIVADO) {
          bucket = conEntregaPrevia.has(c.id as number)
            ? 'anteriores'
            : 'entrega';
          motivo =
            bucket === 'anteriores'
              ? 'Archivado; ya se entregó antes por nota'
              : 'Archivado correctamente';
        } else if (estado === EstadoFisicoC31.EN_ARCHIVO) {
          bucket = 'entrega';
          motivo = 'En archivo (falta confirmar “archivado correctamente”)';
        } else if (estado === EstadoFisicoC31.PRESTADO) {
          bucket = 'anteriores';
          motivo = 'Prestado (ya salió del archivo)';
        } else {
          bucket = 'pendientes';
          motivo = `Aún no está en el archivo (${estado})`;
        }
        const prevs = preventivosDe(c);
        const devs = devengadosDe(c);
        return {
          comprobanteId: c.id as number,
          prev: prevs.join('-'),
          dev: devs.join('-'),
          rotulo:
            prevs.join('-') ||
            (devs.length ? `DEV ${devs.join('-')}` : `C31 #${c.id}`),
          numeros: [...prevs, ...devs.map((d) => `DEV ${d}`)],
          estado,
          bucket,
          motivo,
        };
      })
      .sort(
        (a, b) =>
          (parseInt(a.prev) || 1e9) - (parseInt(b.prev) || 1e9) ||
          a.rotulo.localeCompare(b.rotulo),
      );
    return {
      gestion,
      total: items.length,
      items,
      noRegistrados,
    };
  }

  async pdf(id: number) {
    return notaAuditoriaPdf(await this.findOne(id));
  }

  // ── Solicitudes de Auditoría (simulan la nota que llega de esa unidad) ──
  listarSolicitudes(estado?: string, search?: string) {
    const qb = this.solicitudes
      .createQueryBuilder('s')
      .orderBy('s.fecha', 'DESC')
      .addOrderBy('s.id', 'DESC');
    if (estado) qb.andWhere('s.estado = :e', { e: estado });
    if (search?.trim())
      qb.andWhere(
        '(s.cite ILIKE :q OR s.asunto ILIKE :q OR s.solicitante ILIKE :q)',
        { q: `%${search.trim()}%` },
      );
    return qb.take(200).getMany();
  }

  async solicitud(id: number) {
    const s = await this.solicitudes.findOneBy({ id });
    if (!s) throw new NotFoundException('Solicitud no encontrada');
    return s;
  }

  async crearSolicitud(dto: SolicitudAuditoriaDto, usuario: Usuario) {
    const fecha = dto.fecha ?? hoy();
    const s = await this.solicitudes.save(
      this.solicitudes.create({
        ...dto,
        fecha,
        gestion: dto.gestion ?? Number(fecha.slice(0, 4)),
        estado: 'PENDIENTE',
        ejemplo: false,
        creadoPorId: usuario.id,
      }),
    );
    await this.cites
      .registrarSiNoExiste(
        {
          direccion: 'RECIBIDO',
          tipo: 'NOTA',
          cite: s.cite,
          fecha,
          contraparte: s.solicitante ?? '',
          cargoContraparte: s.cargoSolicitante ?? undefined,
          asunto: s.asunto ?? '',
        },
        'SOLICITUD_AUDITORIA',
        s.id as number,
        usuario,
      )
      .catch(() => undefined);
    return s;
  }

  async actualizarSolicitud(id: number, dto: UpdateSolicitudAuditoriaDto) {
    const s = await this.solicitud(id);
    if (s.estado === 'RESPONDIDA')
      throw new ConflictException('La solicitud ya fue respondida');
    Object.assign(s, dto);
    return this.solicitudes.save(s);
  }

  async eliminarSolicitud(id: number) {
    const s = await this.solicitud(id);
    if (s.estado === 'RESPONDIDA')
      throw new ConflictException('La solicitud ya fue respondida');
    await this.solicitudes.remove(s);
  }

  /**
   * Crea 2 solicitudes de ejemplo con comprobantes reales de la gestión (más algunos
   * N° inexistentes) para probar la selección rápida y la respuesta.
   */
  async solicitudesEjemplo(gestion: number, usuario: Usuario) {
    const filas = await this.dataSource
      .createQueryBuilder(C31Preventivo, 'p')
      .innerJoin('p.comprobante', 'c')
      .select('p.numeroPreventivo', 'n')
      .where('c.gestion = :g', { g: gestion })
      .orderBy('c.id', 'ASC')
      .limit(60)
      .getRawMany<{ n: string }>();
    const nums = [...new Set(filas.map((f) => f.n))];
    if (nums.length < 4)
      throw new BadRequestException(
        `No hay suficientes comprobantes en la gestión ${gestion} para armar ejemplos`,
      );
    const mitad = Math.ceil(nums.length / 2);
    const A = nums.slice(0, mitad);
    const B = nums.slice(mitad);
    const anio = String(gestion);
    const creadas: SolicitudAuditoria[] = [];
    const datos: [string, string, string][] = [
      [
        `GAMSL/AUD/OF-N° 0${10 + Math.floor(Math.random() * 80)}/${anio}`,
        `Solicitud de comprobantes C-31 de la gestión ${anio}`,
        [...A, '99991'].join(', '),
      ],
      [
        `GAMSL/AUD/OF-N° 0${10 + Math.floor(Math.random() * 80)}/${anio}`,
        'Solicitud complementaria de documentación',
        [...B, '99992', '99993'].join(', '),
      ],
    ];
    for (const [cite, asunto, texto] of datos) {
      const s = await this.crearSolicitud(
        {
          cite,
          solicitante: 'Lic. (Ejemplo) Auditor Interno',
          cargoSolicitante: 'JEFE DE AUDITORIA INTERNA',
          asunto,
          texto,
          gestion,
        },
        usuario,
      ).catch(() => null);
      if (s) {
        s.ejemplo = true;
        creadas.push(await this.solicitudes.save(s));
      }
    }
    return creadas;
  }
}
