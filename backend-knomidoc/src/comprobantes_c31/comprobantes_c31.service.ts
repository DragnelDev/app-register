import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import * as ExcelJS from 'exceljs';
import {
  ComprobantesC31,
  ESTADO_FISICO_LABELS,
  EstadoFisicoC31,
  TipoC31,
  TRANSICIONES_MANUALES,
  UBICACION_ARCHIVO_DEFAULT,
} from './entities/comprobantes_c31.entity';
import { CreateComprobantesC31Dto } from './dto/create-comprobantes_c31.dto';
import { CambiarEstadoC31Dto } from './dto/cambiar-estado-comprobantes_c31.dto';
import { UpdateComprobantesC31Dto } from './dto/update-comprobantes_c31.dto';
import { FilterComprobantesC31Dto } from './dto/filter-comprobantes_c31.dto';
import { C31Preventivo } from '../c31-preventivos/entities/c31-preventivo.entity';
import { C31Devengado } from '../c31-devengados/entities/c31-devengado.entity';
import { C31Beneficiario } from '../c31-beneficiarios/entities/c31-beneficiario.entity';
import {
  C31Pago,
  EstadoPago,
  TipoPago,
} from '../c31-pagos/entities/c31-pago.entity';
import { C31CarpetasUbicacion } from '../c31-carpetas-ubicacion/entities/c31-carpetas-ubicacion.entity';
import { registrarCambioEstado } from '../c31-historial/c31-historial.helper';
import { ActasEntrega } from '../actas-entrega/entities/actas-entrega.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { paginationSkip } from '../common/utils/pagination.util';
import { Usuario } from '../usuarios/entities/usuario.entity';

/** Escapa % _ \\ para que el texto del usuario se busque literalmente en un ILIKE. */
const escaparLike = (texto: string): string =>
  texto.replace(/[\\%_]/g, (m) => `\\${m}`);

const RELATIONS = {
  actaEntrega: true,
  creadoPor: true,
  preventivos: true,
  devengados: true,
  beneficiarios: true,
};

/** Los cinco datos que, junto con el N° de preventivo/devengado, completan el registro. */
function datosCompletos(c: {
  montoTotal?: number | string | null;
  fechaElaboracion?: Date | string | null;
  descripcion?: string | null;
  beneficiarios?: unknown[] | null;
}): boolean {
  return (
    Number(c.montoTotal) > 0 &&
    !!c.fechaElaboracion &&
    !!c.descripcion?.trim() &&
    (c.beneficiarios?.length ?? 0) > 0
  );
}

/** Rechaza fechas absurdas (antes de 2000 o más de un año a futuro). */
function validarRangoFecha(fecha?: string) {
  if (!fecha) return;
  const anio = new Date(fecha).getUTCFullYear();
  if (
    Number.isNaN(anio) ||
    anio < 2000 ||
    anio > new Date().getFullYear() + 1
  ) {
    throw new BadRequestException(
      'La fecha de elaboración está fuera de un rango razonable',
    );
  }
}

/** Quita espacios, descarta vacíos y repetidos (sin distinguir mayúsculas) de una lista de textos. */
function limpiarLista(valores?: string[]): string[] {
  const vistos = new Set<string>();
  return (valores ?? [])
    .map((v) => String(v).trim().replace(/\s+/g, ' '))
    .filter((v) => {
      const clave = v.toUpperCase();
      if (!v || vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    });
}

/** Texto de una celda de Excel (soporta texto enriquecido, fórmulas y fechas). */
function textoDeCelda(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if (typeof valor === 'object') {
    const v = valor as {
      text?: string;
      result?: unknown;
      richText?: { text: string }[];
    };
    if (Array.isArray(v.richText))
      return v.richText.map((t) => t.text).join('');
    if (v.text !== undefined) return String(v.text);
    if (
      typeof v.result === 'string' ||
      typeof v.result === 'number' ||
      typeof v.result === 'boolean'
    )
      return String(v.result);
    return '';
  }
  return typeof valor === 'string' || typeof valor === 'number'
    ? String(valor).trim()
    : '';
}

@Injectable()
export class ComprobantesC31Service {
  constructor(
    @InjectRepository(ComprobantesC31)
    private readonly repo: Repository<ComprobantesC31>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Regla del DER: relación 1 a 1 estricta entre comprobantes_c31 y sus
   * tablas hijas de identificación.
   *  - tipoC31 = CON_IMPUTACION -> debe existir numeroPreventivo y NO debe
   *    enviarse numeroDevengado.
   *  - tipoC31 = SIN_IMPUTACION -> debe existir numeroDevengado y NO debe
   *    enviarse numeroPreventivo.
   */
  private validarTipoCoincideConIdentificador(
    tipoC31: TipoC31,
    numeroPreventivo?: string,
    numeroDevengado?: string,
  ) {
    if (tipoC31 === TipoC31.CON_IMPUTACION) {
      if (!numeroPreventivo) {
        throw new BadRequestException(
          'Un comprobante CON_IMPUTACION debe tener un N° de preventivo',
        );
      }
      if (numeroDevengado) {
        throw new BadRequestException(
          'Un comprobante CON_IMPUTACION no puede tener N° de devengado',
        );
      }
    } else {
      if (!numeroDevengado) {
        throw new BadRequestException(
          'Un comprobante SIN_IMPUTACION debe tener un N° de devengado',
        );
      }
      if (numeroPreventivo) {
        throw new BadRequestException(
          'Un comprobante SIN_IMPUTACION no puede tener N° de preventivo',
        );
      }
    }
  }

  /**
   * El N° de preventivo / devengado reserva el correlativo: no puede repetirse
   * dentro de la misma gestión (los comprobantes anulados liberan el número).
   */
  private async validarIdentificadorUnico(
    manager: EntityManager,
    tipoC31: TipoC31,
    numero: string,
    gestion: number,
    excluirId?: number,
  ) {
    const esPreventivo = tipoC31 === TipoC31.CON_IMPUTACION;
    const qb = manager
      .createQueryBuilder(ComprobantesC31, 'c')
      .innerJoin(esPreventivo ? 'c.preventivos' : 'c.devengados', 'i')
      .where('c.gestion = :gestion', { gestion })
      .andWhere('c.estado_fisico <> :anulado', {
        anulado: EstadoFisicoC31.ANULADO,
      })
      .andWhere(
        esPreventivo
          ? 'UPPER(i.numero_preventivo) = UPPER(:numero)'
          : 'UPPER(i.numero_devengado) = UPPER(:numero)',
        { numero },
      );
    if (excluirId) qb.andWhere('c.id <> :excluirId', { excluirId });
    if (await qb.getExists()) {
      throw new ConflictException(
        `Ya existe un comprobante con el N° de ${esPreventivo ? 'preventivo' : 'devengado'} ${numero} en la gestión ${gestion}`,
      );
    }
  }

  /** Mantiene actas_entrega_tesoreria.cantidad_comprobantes = comprobantes vinculados. */
  private async sincronizarCantidadActa(
    manager: EntityManager,
    actaId?: number | null,
  ) {
    if (!actaId) return;
    const cantidad = await manager.countBy(ComprobantesC31, {
      actaEntregaId: actaId,
    });
    await manager.update(ActasEntrega, actaId, {
      cantidadComprobantes: cantidad,
    });
  }

  async create(
    dto: CreateComprobantesC31Dto,
    usuario: Usuario,
  ): Promise<ComprobantesC31> {
    const tipoC31 = (dto.tipoC31 as TipoC31) ?? TipoC31.CON_IMPUTACION;
    const numeroPreventivo = dto.numeroPreventivo?.trim() || undefined;
    const numeroDevengado = dto.numeroDevengado?.trim() || undefined;
    this.validarTipoCoincideConIdentificador(
      tipoC31,
      numeroPreventivo,
      numeroDevengado,
    );
    validarRangoFecha(dto.fechaElaboracion);
    const gestion =
      dto.gestion ??
      (dto.fechaElaboracion
        ? new Date(dto.fechaElaboracion).getUTCFullYear()
        : new Date().getFullYear());
    const nombres = limpiarLista(dto.beneficiarios);
    // Con los cinco datos completos nace "En revisión / firmado"; solo con el N° queda "En trámite"
    const estadoInicial = datosCompletos({ ...dto, beneficiarios: nombres })
      ? EstadoFisicoC31.EN_REVISION
      : EstadoFisicoC31.EN_TRAMITE;

    return this.dataSource.transaction(async (manager) => {
      await this.validarIdentificadorUnico(
        manager,
        tipoC31,
        (numeroPreventivo ?? numeroDevengado) as string,
        gestion,
      );

      // Solo con el N° queda "En trámite (incompleto)" y reserva el correlativo;
      // completando los demás datos pasa solo a "En revisión / firmado".
      const comprobante = manager.create(ComprobantesC31, {
        tipoC31,
        montoTotal: dto.montoTotal,
        fechaElaboracion: (dto.fechaElaboracion as unknown as Date) ?? null,
        descripcion: dto.descripcion ?? null,
        numeroFolio: dto.numeroFolio,
        gestion,
        estadoFisico: estadoInicial,
        ubicacionFisica: dto.ubicacionFisica,
        observaciones: dto.observaciones,
        creadoPorId: usuario.id,
        preventivos: numeroPreventivo
          ? [manager.create(C31Preventivo, { numeroPreventivo })]
          : [],
        devengados: numeroDevengado
          ? [manager.create(C31Devengado, { numeroDevengado })]
          : [],
        beneficiarios: nombres.map((nombreBeneficiario) =>
          manager.create(C31Beneficiario, { nombreBeneficiario }),
        ),
      });

      const guardado = await manager.save(ComprobantesC31, comprobante);
      await registrarCambioEstado(manager, {
        comprobanteId: guardado.id as number,
        estadoNuevo: estadoInicial,
        origen: 'REGISTRO',
        usuarioId: usuario.id,
        detalle:
          estadoInicial === EstadoFisicoC31.EN_REVISION
            ? 'Registrado con todos los datos'
            : 'Registrado solo con el N° (faltan datos por completar)',
      });

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

    const qb = this.repo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.actaEntrega', 'acta')
      .leftJoinAndSelect('c.creadoPor', 'creador')
      .leftJoinAndSelect('c.preventivos', 'prev')
      .leftJoinAndSelect('c.devengados', 'dev')
      .leftJoinAndSelect('c.beneficiarios', 'ben');

    // La gestión SIEMPRE aísla el resultado: los N° de preventivo se repiten entre gestiones.
    if (query.gestion)
      qb.andWhere('c.gestion = :gestion', { gestion: query.gestion });
    if (query.estadoFisico)
      qb.andWhere('c.estadoFisico = :estadoFisico', {
        estadoFisico: query.estadoFisico,
      });
    if (query.tipoC31)
      qb.andWhere('c.tipoC31 = :tipoC31', { tipoC31: query.tipoC31 });
    if (query.actaEntregaId)
      qb.andWhere('c.actaEntregaId = :actaEntregaId', {
        actaEntregaId: query.actaEntregaId,
      });

    // Rango de fechas: admite solo "desde", solo "hasta" o ambos
    if (query.fechaDesde)
      qb.andWhere('c.fechaElaboracion >= :fechaDesde', {
        fechaDesde: query.fechaDesde,
      });
    if (query.fechaHasta)
      qb.andWhere('c.fechaElaboracion <= :fechaHasta', {
        fechaHasta: query.fechaHasta,
      });

    // Pendientes de regularización: firmados (En revisión) que aún no van en un acta
    if (query.sinActa) {
      qb.andWhere('c.actaEntregaId IS NULL').andWhere(
        'c.estadoFisico = :enRevision',
        { enRevision: EstadoFisicoC31.EN_REVISION },
      );
    }
    if (query.sinCarpeta) {
      qb.andWhere('c.estadoFisico = :enArchivo', {
        enArchivo: EstadoFisicoC31.EN_ARCHIVO,
      }).andWhere(
        'NOT EXISTS (SELECT 1 FROM c31_carpetas_ubicacion u0 WHERE u0.comprobante_id = c.id)',
      );
    }

    // Detalle / glosa del gasto (palabras clave: "combustible", "pasajes"...)
    const detalle = query.detalle?.trim();
    if (detalle) {
      qb.andWhere('c.descripcion ILIKE :detalle', {
        detalle: `%${escaparLike(detalle)}%`,
      });
    }

    // N° de preventivo (o devengado en los sin imputación)
    const numero = query.numeroPreventivo?.trim();
    if (numero) {
      qb.andWhere(
        `(EXISTS (SELECT 1 FROM c31_preventivos pv WHERE pv.comprobante_id = c.id AND pv.numero_preventivo ILIKE :numero)
          OR EXISTS (SELECT 1 FROM c31_devengados dv WHERE dv.comprobante_id = c.id AND dv.numero_devengado ILIKE :numero))`,
        { numero: `%${escaparLike(numero)}%` },
      );
    }

    // Ubicación física: depósito > estante > carpeta
    if (query.depositoId || query.estanteId || query.carpetaId) {
      const condiciones: string[] = [];
      const params: Record<string, number> = {};
      if (query.carpetaId) {
        condiciones.push('k.id = :carpetaId');
        params.carpetaId = query.carpetaId;
      }
      if (query.estanteId) {
        condiciones.push('k.estante_id = :estanteId');
        params.estanteId = query.estanteId;
      }
      if (query.depositoId) {
        condiciones.push('e.deposito_id = :depositoId');
        params.depositoId = query.depositoId;
      }
      qb.andWhere(
        `EXISTS (SELECT 1 FROM c31_carpetas_ubicacion u
                 INNER JOIN carpetas k ON k.id = u.carpeta_id
                 LEFT JOIN estantes e ON e.id = k.estante_id
                 WHERE u.comprobante_id = c.id AND ${condiciones.join(' AND ')})`,
        params,
      );
    }

    // Digitalización
    if (query.digitalizado === true)
      qb.andWhere('c.archivoAdjuntoUrl IS NOT NULL');
    if (query.digitalizado === false)
      qb.andWhere('c.archivoAdjuntoUrl IS NULL');

    // Búsqueda libre (se suma a los filtros anteriores, nunca los reemplaza)
    const texto = query.search?.trim();
    if (texto) {
      qb.andWhere(
        `(c.descripcion ILIKE :like
          OR c.numeroFolio ILIKE :like
          OR c.ubicacionFisica ILIKE :like
          OR EXISTS (SELECT 1 FROM c31_preventivos p1 WHERE p1.comprobante_id = c.id AND p1.numero_preventivo ILIKE :like)
          OR EXISTS (SELECT 1 FROM c31_devengados d1 WHERE d1.comprobante_id = c.id AND d1.numero_devengado ILIKE :like)
          OR EXISTS (SELECT 1 FROM c31_beneficiarios b1 WHERE b1.comprobante_id = c.id AND b1.nombre_beneficiario ILIKE :like)
          OR EXISTS (SELECT 1 FROM c31_pagos g1 WHERE g1.comprobante_id = c.id AND g1.numero_documento ILIKE :like))`,
        { like: `%${escaparLike(texto)}%` },
      );
    }

    const [data, total] = await qb
      .orderBy('c.fechaCreacion', query.order ?? 'DESC')
      .addOrderBy('c.id', 'DESC')
      .skip(paginationSkip(page, pageSize))
      .take(pageSize)
      .getManyAndCount();

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
    usuario?: Usuario,
  ): Promise<ComprobantesC31> {
    const comprobante = await this.findOne(id);
    validarRangoFecha(dto.fechaElaboracion);

    if (comprobante.estadoFisico === EstadoFisicoC31.ANULADO) {
      throw new ConflictException(
        'Un comprobante anulado no se puede modificar',
      );
    }

    // Si cambia el tipo o el identificador, el resultado final debe
    // seguir cumpliendo la relación 1 a 1 estricta con tipoC31.
    const prevFinal =
      dto.numeroPreventivo !== undefined
        ? dto.numeroPreventivo.trim() || undefined
        : comprobante.preventivos?.[0]?.numeroPreventivo;
    const devFinal =
      dto.numeroDevengado !== undefined
        ? dto.numeroDevengado.trim() || undefined
        : comprobante.devengados?.[0]?.numeroDevengado;
    const tipoFinal = (dto.tipoC31 as TipoC31) ?? comprobante.tipoC31;
    const gestionFinal = dto.gestion ?? comprobante.gestion;
    const cambiaIdentificador =
      dto.tipoC31 !== undefined ||
      dto.numeroPreventivo !== undefined ||
      dto.numeroDevengado !== undefined ||
      dto.gestion !== undefined;
    if (cambiaIdentificador) {
      this.validarTipoCoincideConIdentificador(tipoFinal, prevFinal, devFinal);
    }
    if (dto.beneficiarios !== undefined) {
      if (limpiarLista(dto.beneficiarios).length === 0) {
        throw new BadRequestException(
          'Debe registrar al menos un beneficiario',
        );
      }
    }

    return this.dataSource.transaction(async (manager) => {
      if (cambiaIdentificador) {
        await this.validarIdentificadorUnico(
          manager,
          tipoFinal,
          (tipoFinal === TipoC31.CON_IMPUTACION
            ? prevFinal
            : devFinal) as string,
          gestionFinal as number,
          id,
        );
      }

      // El monto total no puede quedar por debajo de lo ya asignado en pagos
      if (dto.montoTotal !== undefined) {
        const fila = await manager
          .createQueryBuilder(C31Pago, 'p')
          .select('COALESCE(SUM(p.monto), 0)', 'suma')
          .where('p.comprobante_id = :id', { id })
          .andWhere('p.estado_pago <> :anulado', {
            anulado: EstadoPago.ANULADO,
          })
          .getRawOne<{ suma: string }>();
        const pagos = Math.round(Number(fila?.suma ?? 0) * 100);
        if (Math.round(Number(dto.montoTotal) * 100) < pagos) {
          throw new ConflictException(
            `El monto total no puede ser menor a los pagos registrados (Bs ${(pagos / 100).toFixed(2)})`,
          );
        }
      }

      // Campos simples
      const camposSimples: Record<string, unknown> = {};
      if (dto.tipoC31 !== undefined) camposSimples.tipoC31 = dto.tipoC31;
      if (dto.montoTotal !== undefined)
        camposSimples.montoTotal = dto.montoTotal;
      if (dto.fechaElaboracion !== undefined)
        camposSimples.fechaElaboracion = dto.fechaElaboracion;
      if (dto.descripcion !== undefined)
        camposSimples.descripcion = dto.descripcion;
      if (dto.numeroFolio !== undefined)
        camposSimples.numeroFolio = dto.numeroFolio || null;
      if (dto.gestion !== undefined) camposSimples.gestion = dto.gestion;
      else if (dto.fechaElaboracion !== undefined)
        camposSimples.gestion = new Date(dto.fechaElaboracion).getUTCFullYear();
      if (dto.ubicacionFisica !== undefined)
        camposSimples.ubicacionFisica = dto.ubicacionFisica || null;
      if (dto.observaciones !== undefined)
        camposSimples.observaciones = dto.observaciones || null;

      if (Object.keys(camposSimples).length > 0) {
        await manager.update(ComprobantesC31, id, camposSimples);
      }

      // Reemplazo del identificador 1 a 1 si viene en el DTO
      if (dto.numeroPreventivo !== undefined || dto.tipoC31 !== undefined) {
        await manager.delete(C31Preventivo, { comprobante: { id } });
        if (tipoFinal === TipoC31.CON_IMPUTACION && prevFinal) {
          await manager.save(
            C31Preventivo,
            manager.create(C31Preventivo, {
              numeroPreventivo: prevFinal,
              comprobante: { id } as ComprobantesC31,
            }),
          );
        }
      }
      if (dto.numeroDevengado !== undefined || dto.tipoC31 !== undefined) {
        await manager.delete(C31Devengado, { comprobante: { id } });
        if (tipoFinal === TipoC31.SIN_IMPUTACION && devFinal) {
          await manager.save(
            C31Devengado,
            manager.create(C31Devengado, {
              numeroDevengado: devFinal,
              comprobante: { id } as ComprobantesC31,
            }),
          );
        }
      }
      if (dto.beneficiarios !== undefined) {
        await this.sincronizarBeneficiarios(manager, id, dto.beneficiarios);
      }

      let actualizado = await manager.findOne(ComprobantesC31, {
        where: { id },
        relations: RELATIONS,
      });
      if (!actualizado)
        throw new NotFoundException('El comprobante C31 no existe');

      // Al completar los cinco datos, un comprobante "En trámite" pasa a "En revisión / firmado"
      if (
        actualizado.estadoFisico === EstadoFisicoC31.EN_TRAMITE &&
        datosCompletos(actualizado)
      ) {
        await manager.update(ComprobantesC31, id, {
          estadoFisico: EstadoFisicoC31.EN_REVISION,
        });
        await registrarCambioEstado(manager, {
          comprobanteId: id,
          estadoAnterior: EstadoFisicoC31.EN_TRAMITE,
          estadoNuevo: EstadoFisicoC31.EN_REVISION,
          origen: 'SISTEMA',
          usuarioId: usuario?.id,
          detalle: 'Se completaron todos los datos del comprobante',
        });
        actualizado = await manager.findOneOrFail(ComprobantesC31, {
          where: { id },
          relations: RELATIONS,
        });
      }
      return actualizado;
    });
  }

  /**
   * Aplica la lista de beneficiarios sin recrearlos: los que siguen se
   * conservan (con sus pagos), se agregan los nuevos y solo se quitan los que
   * no tienen pagos asociados.
   */
  private async sincronizarBeneficiarios(
    manager: EntityManager,
    comprobanteId: number,
    nombres: string[],
  ) {
    const deseados = limpiarLista(nombres);
    const claves = new Set(deseados.map((n) => n.toUpperCase()));
    const actuales = await manager.find(C31Beneficiario, {
      where: { comprobante: { id: comprobanteId } },
    });
    const clavesActuales = new Set(
      actuales.map((b) => (b.nombreBeneficiario ?? '').trim().toUpperCase()),
    );

    for (const b of actuales) {
      if (claves.has((b.nombreBeneficiario ?? '').trim().toUpperCase()))
        continue;
      const conPagos = await manager.count(C31Pago, {
        where: { beneficiarioId: b.id },
        withDeleted: true,
      });
      if (conPagos > 0) {
        throw new ConflictException(
          `No se puede quitar a ${b.nombreBeneficiario}: tiene pagos registrados`,
        );
      }
      await manager.delete(C31Beneficiario, b.id as number);
    }
    for (const nombre of deseados) {
      if (clavesActuales.has(nombre.toUpperCase())) continue;
      await manager.save(
        C31Beneficiario,
        manager.create(C31Beneficiario, {
          nombreBeneficiario: nombre,
          comprobante: { id: comprobanteId } as ComprobantesC31,
        }),
      );
    }
  }

  /** Cambio de estado manual con sus reglas (el resto de pasos los hace el sistema). */
  async cambiarEstado(
    id: number,
    dto: CambiarEstadoC31Dto,
    usuario: Usuario,
  ): Promise<ComprobantesC31> {
    const nuevo = dto.estado as EstadoFisicoC31;
    const motivo = dto.motivo?.trim();

    await this.dataSource.transaction(async (manager) => {
      const comprobante = await manager.findOne(ComprobantesC31, {
        where: { id },
      });
      if (!comprobante)
        throw new NotFoundException('El comprobante C31 no existe');
      const actual = comprobante.estadoFisico as EstadoFisicoC31;

      if (actual === nuevo) {
        throw new BadRequestException(
          `El comprobante ya está en "${ESTADO_FISICO_LABELS[actual]}"`,
        );
      }
      if (!TRANSICIONES_MANUALES[actual].includes(nuevo)) {
        const pista =
          actual === EstadoFisicoC31.PRESTADO
            ? '. Registre primero la devolución del préstamo'
            : actual === EstadoFisicoC31.ANULADO
              ? '. Un comprobante anulado ya no cambia de estado'
              : nuevo === EstadoFisicoC31.EN_ARCHIVO
                ? '. Pasa a "En archivo" cuando el archivo recibe el acta de entrega'
                : '';
        throw new ConflictException(
          `No se puede pasar de "${ESTADO_FISICO_LABELS[actual]}" a "${ESTADO_FISICO_LABELS[nuevo]}"${pista}`,
        );
      }
      if (
        (nuevo === EstadoFisicoC31.OBSERVADO ||
          nuevo === EstadoFisicoC31.ANULADO) &&
        !motivo
      ) {
        throw new BadRequestException(
          nuevo === EstadoFisicoC31.OBSERVADO
            ? 'Indique qué se observa (firma, sello o respaldo faltante)'
            : 'Indique el motivo de la anulación',
        );
      }

      if (nuevo === EstadoFisicoC31.EN_REVISION) {
        const completo = await manager.findOne(ComprobantesC31, {
          where: { id },
          relations: { beneficiarios: true },
        });
        if (!completo || !datosCompletos(completo)) {
          throw new ConflictException(
            'Para pasar a "En revisión / firmado" complete el tipo, beneficiarios, glosa, monto total y fecha',
          );
        }
      }

      const cambios: Record<string, unknown> = { estadoFisico: nuevo };

      if (nuevo === EstadoFisicoC31.ARCHIVADO) {
        const ubicado =
          (comprobante.ubicacionFisica &&
            comprobante.ubicacionFisica !== UBICACION_ARCHIVO_DEFAULT) ||
          (await manager.countBy(C31CarpetasUbicacion, {
            comprobante: { id },
          })) > 0;
        if (!comprobante.numeroFolio?.trim() || !ubicado) {
          throw new ConflictException(
            'Para archivarlo correctamente indique su N° de folio y su ubicación final (estante / caja / carpeta)',
          );
        }
      }
      if (nuevo === EstadoFisicoC31.OBSERVADO) cambios.observaciones = motivo;
      if (nuevo === EstadoFisicoC31.ANULADO) {
        const efectuados = await manager.countBy(C31Pago, {
          comprobanteId: id,
          estadoPago: EstadoPago.PAGADO,
        });
        if (efectuados > 0) {
          throw new ConflictException(
            'El comprobante tiene pagos efectuados: anúlelos primero en el módulo de pagos',
          );
        }
        cambios.observaciones = `Anulado: ${motivo}`;
        // Los pagos que seguían pendientes quedan sin efecto con el comprobante
        await manager.update(
          C31Pago,
          { comprobanteId: id, estadoPago: EstadoPago.PENDIENTE },
          { estadoPago: EstadoPago.ANULADO },
        );
      }

      // Si sale del archivo, deja de pertenecer a su acta de entrega
      const actaAnterior = comprobante.actaEntregaId;
      const saleDelArchivo =
        (actual === EstadoFisicoC31.EN_ARCHIVO ||
          actual === EstadoFisicoC31.ARCHIVADO) &&
        (nuevo === EstadoFisicoC31.OBSERVADO ||
          nuevo === EstadoFisicoC31.EN_TRAMITE ||
          nuevo === EstadoFisicoC31.EN_REVISION);
      if (saleDelArchivo) cambios.actaEntregaId = null;

      await manager.update(ComprobantesC31, id, cambios);
      await registrarCambioEstado(manager, {
        comprobanteId: id,
        estadoAnterior: actual,
        estadoNuevo: nuevo,
        origen: 'MANUAL',
        usuarioId: usuario.id,
        detalle: motivo ?? null,
      });
      if (saleDelArchivo)
        await this.sincronizarCantidadActa(manager, actaAnterior);
    });

    return this.findOne(id);
  }

  async remove(id: number): Promise<ComprobantesC31> {
    const comprobante = await this.findOne(id);
    if (comprobante.estadoFisico === EstadoFisicoC31.PRESTADO) {
      throw new ConflictException(
        'No se puede eliminar un comprobante que se encuentra prestado',
      );
    }
    return this.dataSource.transaction(async (manager) => {
      const eliminado = await manager.softRemove(ComprobantesC31, comprobante);
      await this.sincronizarCantidadActa(manager, comprobante.actaEntregaId);
      return eliminado;
    });
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
    // Columna del formato institucional; corresponde a comprobantes_c31.ubicacion_fisica
    { header: 'CARPETA', key: 'carpeta', width: 20 },
  ];

  /** RF-02.2 / plantilla institucional: exporta los comprobantes de una gestión con el mismo formato usado en archivo físico. */
  async exportExcel(gestion?: number): Promise<Buffer> {
    const where: FindOptionsWhere<ComprobantesC31> = {};
    if (gestion) where.gestion = gestion;

    const comprobantes = await this.repo.find({
      where,
      relations: { ...RELATIONS, pagos: true },
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
        prev:
          c.preventivos?.[0]?.numeroPreventivo ??
          c.devengados?.[0]?.numeroDevengado ??
          '',
        cheque: (c.pagos ?? [])
          .filter(
            (p) =>
              p.tipoPago === TipoPago.CHEQUE &&
              p.estadoPago !== EstadoPago.ANULADO,
          )
          .map((p) => p.numeroDocumento)
          .join('   '),
        beneficiario: (c.beneficiarios ?? [])
          .map((b) => b.nombreBeneficiario)
          .join(', '),
        descripcion: c.descripcion,
        monto: Number(c.montoTotal).toFixed(2),
        fecha: c.fechaElaboracion,
        folio: c.numeroFolio ?? '',
        carpeta: c.ubicacionFisica ?? '',
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
   * MONTO, FECHA, Nº DE FOLIO, CARPETA). La columna CARPETA se guarda como
   * ubicación física del comprobante.
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
        ubicacion,
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

        const montoNumerico = Number(textoDeCelda(monto).replace(/,/g, ''));
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
        if (Number.isNaN(fechaElaboracion.getTime())) {
          throw new Error('La fecha no es válida');
        }

        // Un solo identificador por comprobante (relación 1 a 1 estricta).
        // Si la celda trae varios números (formato "2 en 1"), se conservan
        // juntos como texto libre en numeroPreventivo.
        const numeroPreventivo = textoDeCelda(prev).trim() || 'S/N';

        const cheques = textoDeCelda(cheque)
          .split(/\s+/)
          .map((s) => s.trim())
          .filter(Boolean);

        const beneficiarios = (textoDeCelda(beneficiario) || 'S/N')
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean);

        const numeroFolio = textoDeCelda(folio) || undefined;
        const ubicacionFisica =
          textoDeCelda(ubicacion).slice(0, 150) || undefined;

        await this.dataSource.transaction(async (manager) => {
          const comprobante = manager.create(ComprobantesC31, {
            tipoC31: TipoC31.CON_IMPUTACION,
            montoTotal: montoNumerico,
            fechaElaboracion: fechaElaboracion,
            descripcion: textoDeCelda(descripcion),
            numeroFolio,
            ubicacionFisica,
            gestion,
            // Archivo histórico ya foliado y ubicado -> Archivado; si no, En archivo
            estadoFisico:
              numeroFolio && ubicacionFisica
                ? EstadoFisicoC31.ARCHIVADO
                : EstadoFisicoC31.EN_ARCHIVO,
            creadoPorId: usuario.id,
            preventivos: [manager.create(C31Preventivo, { numeroPreventivo })],
            beneficiarios: beneficiarios.map((nombreBeneficiario) =>
              manager.create(C31Beneficiario, { nombreBeneficiario }),
            ),
          });
          const guardado = await manager.save(ComprobantesC31, comprobante);
          await registrarCambioEstado(manager, {
            comprobanteId: guardado.id as number,
            estadoNuevo: guardado.estadoFisico as string,
            origen: 'REGISTRO',
            usuarioId: usuario.id,
            detalle: 'Importado desde Excel',
          });

          // Cada pago se liga a un beneficiario; con varios beneficiarios no se
          // sabe a quién corresponde cada cheque, así que se dejan en observaciones.
          if (cheques.length > 0) {
            if (guardado.beneficiarios?.length === 1) {
              await manager.save(
                C31Pago,
                cheques.map((numeroDocumento) =>
                  manager.create(C31Pago, {
                    comprobanteId: guardado.id,
                    beneficiarioId: guardado.beneficiarios?.[0].id,
                    tipoPago: TipoPago.CHEQUE,
                    numeroDocumento,
                    // Con un solo cheque el monto es el del comprobante; con varios se completa después
                    monto: cheques.length === 1 ? montoNumerico : null,
                    estadoPago: EstadoPago.PAGADO,
                    creadoPorId: usuario.id,
                  }),
                ),
              );
            } else {
              await manager.update(ComprobantesC31, guardado.id as number, {
                observaciones: `Cheques del Excel: ${cheques.join(', ')}`,
              });
            }
          }
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
