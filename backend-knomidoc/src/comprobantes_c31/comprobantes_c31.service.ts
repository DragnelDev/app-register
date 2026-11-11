import {
  devengadosDe,
  preventivosDe,
  rotuloC31,
} from '../common/utils/identificador-c31.util';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  In,
  Repository,
} from 'typeorm';
import * as ExcelJS from 'exceljs';
import { randomUUID } from 'crypto';
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
import {
  BeneficiariosService,
  claveNombre,
} from '../beneficiarios/beneficiarios.service';
import { C31Beneficiario } from '../c31-beneficiarios/entities/c31-beneficiario.entity';
import {
  C31Pago,
  EstadoPago,
  TipoPago,
} from '../c31-pagos/entities/c31-pago.entity';
import { Carpeta } from '../carpetas/entities/carpeta.entity';
import { C31CarpetasUbicacion } from '../c31-carpetas-ubicacion/entities/c31-carpetas-ubicacion.entity';
import { registrarCambioEstado } from '../c31-historial/c31-historial.helper';
import { ActasEntrega } from '../actas-entrega/entities/actas-entrega.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { paginationSkip } from '../common/utils/pagination.util';
import { Usuario } from '../usuarios/entities/usuario.entity';

import {
  campoDeEncabezado,
  codigoDeCarpeta,
  normalizarEncabezado,
  numerosDeCelda,
  parseFechaCelda,
  parseMonto,
  type CampoImport,
} from './import-utils';

import { fichaC31Pdf, listadoC31Pdf } from './comprobantes-pdf.util';

import { adjuntarRotuloGrupo } from '../common/utils/rotulo-grupo.util';

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

/** El remitente solo trabaja con comprobantes hasta "Firmado" (En revisión). */
const ESTADOS_REMITENTE: readonly EstadoFisicoC31[] = [
  EstadoFisicoC31.EN_TRAMITE,
  EstadoFisicoC31.EN_REVISION,
];
const esRemitente = (u?: Usuario) =>
  (u?.rolActivo ?? u?.rol) === 'REMITENTE_C31';

/** El remitente no define folio ni ubicación física: eso lo hace Archivo. */
function exigirSinLogistica(
  dto: { numeroFolio?: string | null; ubicacionFisica?: string | null },
  usuario?: Usuario,
) {
  if (
    esRemitente(usuario) &&
    ((dto.numeroFolio ?? '') !== '' || (dto.ubicacionFisica ?? '') !== '')
  ) {
    throw new ForbiddenException(
      'Su perfil no puede registrar el N° de folio ni la ubicación física',
    );
  }
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
    private readonly beneficiariosService: BeneficiariosService,
  ) {}

  /**
   * Nombres de los beneficiarios que llegan en el DTO: los del directorio (por id)
   * más los escritos a mano. Undefined si el DTO no toca los beneficiarios.
   */
  private async nombresBeneficiarios(dto: {
    beneficiarios?: string[];
    beneficiarioIds?: number[];
  }): Promise<string[] | undefined> {
    if (dto.beneficiarios === undefined && dto.beneficiarioIds === undefined)
      return undefined;
    const deIds = dto.beneficiarioIds?.length
      ? await this.beneficiariosService.nombresDe(dto.beneficiarioIds)
      : [];
    return limpiarLista([...deIds, ...(dto.beneficiarios ?? [])]);
  }

  /**
   * Un C31 real puede agrupar varios preventivos (PREV 3 y 7 como un solo
   * comprobante) y/o devengados. Reúne todos los números que llegan en el DTO
   * (listas + atajos de uno solo), sin vacíos ni repetidos.
   */
  private numerosDelDto(dto: {
    preventivos?: string[];
    devengados?: string[];
    numeroPreventivo?: string;
    numeroDevengado?: string;
  }) {
    return {
      preventivos: limpiarLista([
        ...(dto.preventivos ?? []),
        ...(dto.numeroPreventivo ? [dto.numeroPreventivo] : []),
      ]),
      devengados: limpiarLista([
        ...(dto.devengados ?? []),
        ...(dto.numeroDevengado ? [dto.numeroDevengado] : []),
      ]),
    };
  }

  /** Con al menos un preventivo es CON_IMPUTACION (también si trae devengados). */
  private derivarTipo(preventivos: string[], devengados: string[]): TipoC31 {
    if (preventivos.length === 0 && devengados.length === 0) {
      throw new BadRequestException(
        'Registre al menos un N° de preventivo o de devengado',
      );
    }
    if (preventivos.length + devengados.length > 1) {
      throw new BadRequestException(
        'Cada comprobante nace con un solo N° de preventivo o de devengado. Para unirlos use la opción "Unir comprobantes".',
      );
    }
    return preventivos.length > 0
      ? TipoC31.CON_IMPUTACION
      : TipoC31.SIN_IMPUTACION;
  }

  /**
   * Cada N° de preventivo / devengado reserva su correlativo: no puede repetirse
   * en otro comprobante de la misma gestión (los anulados liberan el número).
   */
  private async validarIdentificadoresUnicos(
    manager: EntityManager,
    preventivos: string[],
    devengados: string[],
    gestion: number,
    excluirId?: number,
  ) {
    const revisar = async (
      numeros: string[],
      relacion: 'c.preventivos' | 'c.devengados',
      columna: string,
      etiqueta: string,
    ) => {
      for (const numero of numeros) {
        const qb = manager
          .createQueryBuilder(ComprobantesC31, 'c')
          .innerJoin(relacion, 'i')
          .where('c.gestion = :gestion', { gestion })
          .andWhere('c.estado_fisico <> :anulado', {
            anulado: EstadoFisicoC31.ANULADO,
          })
          .andWhere(`UPPER(i.${columna}) = UPPER(:numero)`, { numero });
        if (excluirId) qb.andWhere('c.id <> :excluirId', { excluirId });
        if (await qb.getExists()) {
          throw new ConflictException(
            `Ya existe un comprobante con el N° de ${etiqueta} ${numero} en la gestión ${gestion}`,
          );
        }
      }
    };
    await revisar(
      preventivos,
      'c.preventivos',
      'numero_preventivo',
      'preventivo',
    );
    await revisar(devengados, 'c.devengados', 'numero_devengado', 'devengado');
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
    exigirSinLogistica(dto, usuario);
    const { preventivos, devengados } = this.numerosDelDto(dto);
    const tipoC31 = this.derivarTipo(preventivos, devengados);
    validarRangoFecha(dto.fechaElaboracion);
    const gestion =
      dto.gestion ??
      (dto.fechaElaboracion
        ? new Date(dto.fechaElaboracion).getUTCFullYear()
        : new Date().getFullYear());
    const nombres = (await this.nombresBeneficiarios(dto)) ?? [];
    // Con los cinco datos completos nace "En revisión / firmado"; solo con el N° queda "En trámite"
    const estadoInicial = datosCompletos({ ...dto, beneficiarios: nombres })
      ? EstadoFisicoC31.EN_REVISION
      : EstadoFisicoC31.EN_TRAMITE;

    return this.dataSource.transaction(async (manager) => {
      await this.validarIdentificadoresUnicos(
        manager,
        preventivos,
        devengados,
        gestion,
      );

      const catalogo = await this.beneficiariosService.catalogar(
        manager,
        nombres,
        usuario.id,
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
        preventivos: preventivos.map((numeroPreventivo) =>
          manager.create(C31Preventivo, { numeroPreventivo }),
        ),
        devengados: devengados.map((numeroDevengado) =>
          manager.create(C31Devengado, { numeroDevengado }),
        ),
        beneficiarios: nombres.map((nombreBeneficiario) =>
          manager.create(C31Beneficiario, {
            nombreBeneficiario,
            beneficiarioId: catalogo.get(claveNombre(nombreBeneficiario)),
          }),
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

  /** Consulta con TODOS los filtros del listado (sin orden ni paginación): la usan listado y exportación */
  private construirConsultaFiltrada(
    query: FilterComprobantesC31Dto,
    usuario?: Usuario,
  ) {
    const qb = this.repo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.actaEntrega', 'acta')
      .leftJoinAndSelect('c.creadoPor', 'creador')
      .leftJoinAndSelect('c.preventivos', 'prev')
      .leftJoinAndSelect('c.devengados', 'dev')
      .leftJoinAndSelect('c.beneficiarios', 'ben');

    if (esRemitente(usuario))
      qb.andWhere('c.estadoFisico IN (:...estadosRemitente)', {
        estadosRemitente: ESTADOS_REMITENTE,
      });

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
    if (query.sinEnviar) qb.andWhere('c.actaEntregaId IS NULL');
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

    // Beneficiario del directorio
    if (query.beneficiarioId) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM c31_beneficiarios bf WHERE bf.comprobante_id = c.id AND bf.beneficiario_id = :beneficiarioId)`,
        { beneficiarioId: query.beneficiarioId },
      );
    }

    // N° de preventivo o de devengado. Son numeraciones distintas (PREV 1 ≠ DEV 1):
    // con el tipo elegido se busca solo en su tabla; sin tipo, en ambas.
    const numero = query.numeroPreventivo?.trim();
    if (numero) {
      const enPrev = `EXISTS (SELECT 1 FROM c31_preventivos pv WHERE pv.comprobante_id = c.id AND pv.numero_preventivo ILIKE :numero)`;
      const enDev = `EXISTS (SELECT 1 FROM c31_devengados dv WHERE dv.comprobante_id = c.id AND dv.numero_devengado ILIKE :numero)`;
      const donde =
        query.tipoC31 === 'CON_IMPUTACION'
          ? enPrev
          : query.tipoC31 === 'SIN_IMPUTACION'
            ? enDev
            : `(${enPrev} OR ${enDev})`;
      qb.andWhere(donde, { numero: `%${escaparLike(numero)}%` });
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

    return qb;
  }

  async findAll(
    query: FilterComprobantesC31Dto,
    usuario?: Usuario,
  ): Promise<PaginatedResponseDto<ComprobantesC31>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const qb = this.construirConsultaFiltrada(query, usuario);

    const [data, total] = await qb
      .orderBy('c.fechaCreacion', query.order ?? 'DESC')
      .addOrderBy('c.id', 'DESC')
      .skip(paginationSkip(page, pageSize))
      .take(pageSize)
      .getManyAndCount();

    return new PaginatedResponseDto(data, total, page, pageSize);
  }

  /**
   * Une comprobantes que en la práctica vienen como uno solo (PREV 3 + PREV 7,
   * PREV + DEV). No fusiona registros: solo los agrupa. Si alguno ya pertenece
   * a un grupo, los demás se suman a ese grupo; dos grupos distintos no se mezclan.
   */
  async unir(ids: number[], usuario?: Usuario) {
    const unicos = [...new Set(ids)];
    if (unicos.length < 2) {
      throw new BadRequestException(
        'Seleccione al menos 2 comprobantes para unir',
      );
    }
    return this.dataSource.transaction(async (manager) => {
      const items = await manager.find(ComprobantesC31, {
        where: { id: In(unicos) },
      });
      if (items.length !== unicos.length) {
        throw new NotFoundException('Algún comprobante no existe');
      }
      if (items.some((c) => c.estadoFisico === EstadoFisicoC31.ANULADO)) {
        throw new ConflictException('No se pueden unir comprobantes anulados');
      }
      this.exigirEstadoRemitente(items, usuario);
      if (new Set(items.map((c) => c.gestion)).size > 1) {
        throw new ConflictException(
          'Solo se unen comprobantes de la misma gestión',
        );
      }
      const gruposPrevios = [
        ...new Set(items.map((c) => c.grupoUnionId).filter(Boolean)),
      ] as string[];
      if (gruposPrevios.length > 1) {
        throw new ConflictException(
          'Los comprobantes seleccionados ya pertenecen a grupos distintos: separe primero el que no corresponde',
        );
      }
      // Solo se suman los comprobantes indicados al grupo existente (o a uno nuevo);
      // nunca se arrastra a otros miembros ni se mezclan grupos.
      const grupo = gruposPrevios[0] ?? randomUUID();
      await manager.update(
        ComprobantesC31,
        { id: In(unicos) },
        { grupoUnionId: grupo },
      );
      return this.grupoDe(unicos[0], manager);
    });
  }

  /** Un remitente no toca comprobantes que ya pasaron de "Firmado". */
  private exigirEstadoRemitente(items: ComprobantesC31[], usuario?: Usuario) {
    if (
      esRemitente(usuario) &&
      items.some(
        (c) => !ESTADOS_REMITENTE.includes(c.estadoFisico as EstadoFisicoC31),
      )
    ) {
      throw new ForbiddenException(
        'Su perfil solo puede trabajar con comprobantes hasta el estado Firmado (En revisión)',
      );
    }
  }

  /** Saca un comprobante de su grupo; si el grupo queda con uno solo, se disuelve. */
  async separar(id: number, usuario?: Usuario) {
    await this.dataSource.transaction(async (manager) => {
      const c = await manager.findOne(ComprobantesC31, { where: { id } });
      if (!c) throw new NotFoundException('El comprobante C31 no existe');
      this.exigirEstadoRemitente([c], usuario);
      if (!c.grupoUnionId) return;
      const grupo = c.grupoUnionId;
      await manager.update(ComprobantesC31, { id }, { grupoUnionId: null });
      const restantes = await manager.count(ComprobantesC31, {
        where: { grupoUnionId: grupo },
      });
      if (restantes < 2) {
        await manager.update(
          ComprobantesC31,
          { grupoUnionId: grupo },
          { grupoUnionId: null },
        );
      }
    });
    return { separado: true };
  }

  /** Comprobantes unidos al indicado (incluido él mismo). Vacío si no está unido. */
  async grupoDe(id: number, manager?: EntityManager) {
    const m = manager ?? this.dataSource.manager;
    const c = await m.findOne(ComprobantesC31, { where: { id } });
    if (!c) throw new NotFoundException('El comprobante C31 no existe');
    if (!c.grupoUnionId) return [];
    const miembros = await m.find(ComprobantesC31, {
      where: { grupoUnionId: c.grupoUnionId },
      relations: { preventivos: true, devengados: true },
      order: { id: 'ASC' },
    });
    return miembros.map((x) => ({
      id: x.id,
      tipoC31: x.tipoC31,
      identificador: rotuloC31(x, `#${x.id}`),
      estadoFisico: x.estadoFisico,
      montoTotal: x.montoTotal,
      actaEntregaId: x.actaEntregaId,
    }));
  }

  async findOne(id: number, usuario?: Usuario): Promise<ComprobantesC31> {
    const comprobante = await this.repo.findOne({
      where: { id },
      relations: RELATIONS,
    });
    if (!comprobante)
      throw new NotFoundException('El comprobante C31 no existe');
    this.exigirEstadoRemitente([comprobante], usuario);
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
    this.exigirEstadoRemitente([comprobante], usuario);
    exigirSinLogistica(dto, usuario);
    // Un comprobante ya archivado solo se modifica dejando constancia del motivo
    const motivoModificacion = dto.motivoModificacion?.trim();
    const eraArchivado = comprobante.estadoFisico === EstadoFisicoC31.ARCHIVADO;
    if (
      eraArchivado &&
      (!motivoModificacion || motivoModificacion.length < 5)
    ) {
      throw new BadRequestException(
        'El comprobante está archivado: indique el motivo de la modificación (mínimo 5 caracteres)',
      );
    }

    // Si se envía alguna lista/atajo de identificadores, esa lista reemplaza a la
    // del mismo tipo; la que no se envía se conserva. El tipo se deriva del resultado.
    const enviaPrev =
      dto.preventivos !== undefined || dto.numeroPreventivo !== undefined;
    const enviaDev =
      dto.devengados !== undefined || dto.numeroDevengado !== undefined;
    const numeros = this.numerosDelDto(dto);
    const prevFinal = enviaPrev
      ? numeros.preventivos
      : preventivosDe(comprobante);
    const devFinal = enviaDev ? numeros.devengados : devengadosDe(comprobante);
    // Los registros existentes se conservan: solo se re-deriva el tipo si cambian los identificadores.
    const tipoFinal =
      enviaPrev || enviaDev
        ? this.derivarTipo(prevFinal, devFinal)
        : comprobante.tipoC31;
    const gestionFinal = dto.gestion ?? comprobante.gestion;
    const cambiaIdentificador =
      enviaPrev || enviaDev || dto.gestion !== undefined;
    const nombresNuevos = await this.nombresBeneficiarios(dto);
    if (nombresNuevos !== undefined) {
      if (nombresNuevos.length === 0) {
        throw new BadRequestException(
          'Debe registrar al menos un beneficiario',
        );
      }
    }

    return this.dataSource.transaction(async (manager) => {
      if (cambiaIdentificador) {
        await this.validarIdentificadoresUnicos(
          manager,
          prevFinal,
          devFinal,
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
      if (tipoFinal !== comprobante.tipoC31) camposSimples.tipoC31 = tipoFinal;
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
      if (eraArchivado) {
        const campos = [
          ...Object.keys(camposSimples),
          ...(enviaPrev ? ['preventivos'] : []),
          ...(enviaDev ? ['devengados'] : []),
          ...(nombresNuevos !== undefined ? ['beneficiarios'] : []),
        ];
        await registrarCambioEstado(manager, {
          comprobanteId: id,
          estadoAnterior: EstadoFisicoC31.ARCHIVADO,
          estadoNuevo: EstadoFisicoC31.ARCHIVADO,
          origen: 'MODIFICACION',
          usuarioId: usuario?.id,
          detalle: `${motivoModificacion}${campos.length ? ` (campos: ${campos.join(', ')})` : ''}`,
        });
      }

      // Reemplazo de las listas de identificadores enviadas en el DTO
      if (enviaPrev) {
        await manager.delete(C31Preventivo, { comprobante: { id } });
        if (prevFinal.length > 0) {
          await manager.save(
            C31Preventivo,
            prevFinal.map((numeroPreventivo) =>
              manager.create(C31Preventivo, {
                numeroPreventivo,
                comprobante: { id } as ComprobantesC31,
              }),
            ),
          );
        }
      }
      if (enviaDev) {
        await manager.delete(C31Devengado, { comprobante: { id } });
        if (devFinal.length > 0) {
          await manager.save(
            C31Devengado,
            devFinal.map((numeroDevengado) =>
              manager.create(C31Devengado, {
                numeroDevengado,
                comprobante: { id } as ComprobantesC31,
              }),
            ),
          );
        }
      }
      if (nombresNuevos !== undefined) {
        await this.sincronizarBeneficiarios(
          manager,
          id,
          nombresNuevos,
          usuario?.id,
        );
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
    usuarioId?: number,
  ) {
    const deseados = limpiarLista(nombres);
    const catalogo = await this.beneficiariosService.catalogar(
      manager,
      deseados,
      usuarioId,
    );
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
          beneficiarioId: catalogo.get(claveNombre(nombre)),
          comprobante: { id: comprobanteId } as ComprobantesC31,
        }),
      );
    }
    // Los beneficiarios que ya estaban y aún no tenían vínculo con el directorio
    for (const b of actuales) {
      if (b.beneficiarioId) continue;
      const id = catalogo.get(claveNombre(b.nombreBeneficiario ?? ''));
      if (id)
        await manager.update(C31Beneficiario, b.id as number, {
          beneficiarioId: id,
        });
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
      if (
        esRemitente(usuario) &&
        !(
          ESTADOS_REMITENTE.includes(actual) &&
          ESTADOS_REMITENTE.includes(nuevo)
        )
      ) {
        throw new ForbiddenException(
          'Su perfil solo puede pasar un comprobante entre "En trámite" y "En revisión / firmado"',
        );
      }

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
          nuevo === EstadoFisicoC31.NO_ENCONTRADO ||
          nuevo === EstadoFisicoC31.ANULADO) &&
        !motivo
      ) {
        throw new BadRequestException(
          nuevo === EstadoFisicoC31.OBSERVADO
            ? 'Indique qué se observa (firma, sello o respaldo faltante)'
            : nuevo === EstadoFisicoC31.NO_ENCONTRADO
              ? 'Indique cómo se constató que no se encuentra (revisión, fecha, quién lo buscó)'
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
      if (nuevo === EstadoFisicoC31.NO_ENCONTRADO)
        cambios.observaciones = `No se encuentra en archivos: ${motivo}`;
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

  /** PDF del listado con los mismos filtros de pantalla (hasta 5000 filas). */
  async listadoPdf(
    query: FilterComprobantesC31Dto,
    usuario?: Usuario,
  ): Promise<Buffer> {
    const q = Object.assign(new FilterComprobantesC31Dto(), query, {
      page: 1,
      pageSize: 5000,
    });
    const r = await this.findAll(q, usuario);
    const ETQ: Record<string, string> = {
      gestion: 'Gestión',
      search: 'Búsqueda',
      estadoFisico: 'Estado',
      tipoC31: 'Tipo',
      fechaDesde: 'Desde',
      fechaHasta: 'Hasta',
      detalle: 'Glosa',
      numeroPreventivo: 'N° PREV',
    };
    const filtros = Object.entries(ETQ)
      .map(([k, etq]) => {
        const v = (query as unknown as Record<string, unknown>)[k];
        return v === undefined || v === '' || v === null
          ? ''
          : `${etq}: ${k === 'estadoFisico' ? (ESTADO_FISICO_LABELS[v as EstadoFisicoC31] ?? String(v)) : String(v)}`;
      })
      .filter(Boolean)
      .join(' · ');
    await adjuntarRotuloGrupo(this.repo.manager, r.data);
    return listadoC31Pdf(r.data, { filtros, total: r.total });
  }

  /** PDF con la ficha de un comprobante. */
  async fichaPdf(id: number, usuario?: Usuario): Promise<Buffer> {
    const c = await this.repo.findOne({
      where: { id },
      relations: { ...RELATIONS, pagos: true },
    });
    if (!c) throw new NotFoundException('El comprobante C31 no existe');
    this.exigirEstadoRemitente([c], usuario);
    await adjuntarRotuloGrupo(this.repo.manager, c);
    return fichaC31Pdf(c);
  }

  private static readonly COLUMNAS_EXPORT = [
    { header: 'Nº PREV', key: 'prev', width: 13 },
    { header: 'Nº DEV', key: 'dev', width: 13 },
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
  async exportExcel(
    query: FilterComprobantesC31Dto,
    usuario?: Usuario,
  ): Promise<Buffer> {
    const gestion = query.gestion ? Number(query.gestion) : undefined;
    // Mismos filtros que el listado en pantalla; se obtienen los ids y luego los datos completos
    const filas = await this.construirConsultaFiltrada(query, usuario)
      .select('c.id')
      .orderBy('c.fechaElaboracion', 'ASC')
      .addOrderBy('c.id', 'ASC')
      .getMany();
    const ids = filas.map((f) => f.id);
    const comprobantes = ids.length
      ? (
          await this.repo.find({
            where: { id: In(ids) },
            relations: { ...RELATIONS, pagos: true },
          })
        ).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
      : [];

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
        prev: (c.preventivos ?? []).map((p) => p.numeroPreventivo).join(', '),
        dev: (c.devengados ?? []).map((d) => d.numeroDevengado).join(', '),
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
        fecha: String(c.fechaElaboracion ?? '')
          .slice(0, 10)
          .split('-')
          .reverse()
          .join('/'),
        folio: c.numeroFolio ?? '',
        carpeta: c.ubicacionFisica ?? '',
      });
      fila.eachCell((celda, colNumber) => {
        celda.border = bordeFino;
        celda.alignment = {
          horizontal: colNumber === 5 ? 'left' : 'center',
          vertical: 'middle',
          wrapText: true,
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * RF-02.1: importación masiva desde el Excel histórico (Nº DEV / Nº PREV, Nº CHEQUE,
   * BENEFICIARIO, DESCRIPCION, MONTO, FECHA, Nº DE FOLIO, Nº CARPETA, UBICACIÓN FÍSICA,
   * OBSERVACIONES).
   * - Una fila = un comprobante. "DEV.5/6" o "4-5" son varios N° del MISMO comprobante.
   * - "Nº CARPETA" 4-5-6 enlaza el comprobante a varias carpetas (se crean si no existen).
   * - Si el N° de PREV/DEV ya existe en la gestión, la fila se omite (reimportar es seguro).
   * - Con simular=true no guarda nada: devuelve la vista previa fila por fila.
   */
  async importExcel(
    buffer: Buffer,
    gestion: number,
    usuario: Usuario,
    simular = false,
  ): Promise<ResultadoImportacion> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    } catch {
      // exceljs lanza si el contenido no es un .xlsx válido (PDF renombrado,
      // archivo dañado, etc.): es un error del cliente, no del servidor.
      throw new BadRequestException(
        'El archivo no es un Excel válido (.xlsx). Verifica que no esté dañado.',
      );
    }
    if (!workbook.worksheets.length) {
      throw new BadRequestException('El archivo no contiene ninguna hoja');
    }

    const errores: { fila: number; motivo: string }[] = [];
    const omitidos: { fila: number; motivo: string }[] = [];
    const filas: FilaImportacion[] = [];
    let creados = 0;
    // Evita duplicados dentro del mismo archivo (y entre hojas)
    const vistosPrev = new Set<string>();
    const vistosDev = new Set<string>();
    let hojasLeidas = 0;

    for (const hoja of workbook.worksheets) {
      // Ubica la fila de encabezado buscando BENEFICIARIO + DESCRIPCION
      let filaEncabezado = -1;
      hoja.eachRow((row, rowNumber) => {
        if (filaEncabezado !== -1) return;
        const textos = (row.values as unknown[])
          // Sin tildes ni símbolos: "Descripción" debe reconocerse como DESCRIPCION
          .map((v) => (typeof v === 'string' ? normalizarEncabezado(v) : ''))
          .join('|');
        if (textos.includes('BENEFICIARIO') && textos.includes('DESCRIPCION')) {
          filaEncabezado = rowNumber;
        }
      });
      if (filaEncabezado === -1) continue; // hoja sin formato (resúmenes, etc.)

      const col: Partial<Record<CampoImport, number>> = {};
      hoja.getRow(filaEncabezado).eachCell((celdaEnc, n) => {
        const campo = campoDeEncabezado(textoDeCelda(celdaEnc.value));
        if (campo && col[campo] === undefined) col[campo] = n;
      });
      if (!col.descripcion || !col.monto || (!col.prev && !col.dev)) continue;
      hojasLeidas++;
      const celda = (fila: ExcelJS.Row, campo: CampoImport): unknown =>
        col[campo] ? fila.getCell(col[campo]).value : undefined;

      for (let r = filaEncabezado + 1; r <= hoja.rowCount; r++) {
        const fila = hoja.getRow(r);
        const prev = celda(fila, 'prev');
        const dev = celda(fila, 'dev');
        const cheque = celda(fila, 'cheque');
        const beneficiario = celda(fila, 'beneficiario');
        const descripcion = celda(fila, 'descripcion');
        const monto = celda(fila, 'monto');
        const fecha = celda(fila, 'fecha');
        const folio = celda(fila, 'folio');
        const carpetaCelda = celda(fila, 'carpeta');
        const ubicacion = celda(fila, 'ubicacion');
        const estadoCelda = celda(fila, 'estado');
        const observacionesCelda = celda(fila, 'observaciones');

        const vacia =
          !textoDeCelda(descripcion) &&
          !textoDeCelda(beneficiario) &&
          !textoDeCelda(monto) &&
          !textoDeCelda(prev) &&
          !textoDeCelda(dev);
        if (vacia) continue;

        const detalle: FilaImportacion = {
          fila: r,
          hoja: hoja.name,
          preventivos: [],
          devengados: [],
          carpetas: [],
          monto: null,
          estado: 'OK',
          advertencias: [],
        };
        filas.push(detalle);

        try {
          // Preventivos van a Preventivos y devengados a Devengados (nunca mezclados)
          const np = numerosDeCelda(textoDeCelda(prev));
          const nd = numerosDeCelda(textoDeCelda(dev));
          const preventivosCelda = np.numeros;
          const devengadosCelda = nd.numeros;
          detalle.preventivos = preventivosCelda;
          detalle.devengados = devengadosCelda;
          detalle.advertencias.push(...np.advertencias, ...nd.advertencias);
          if (!preventivosCelda.length && !devengadosCelda.length) {
            throw new Error('Falta el Nº de preventivo o de devengado');
          }
          if (!textoDeCelda(descripcion)) {
            throw new Error('Falta la descripción del comprobante');
          }
          if (!textoDeCelda(monto)) {
            throw new Error('Falta el monto del comprobante');
          }
          const montoNumerico = parseMonto(
            typeof monto === 'number' ? monto : textoDeCelda(monto),
          );
          if (montoNumerico === null || montoNumerico <= 0) {
            throw new Error(
              `El monto "${textoDeCelda(monto)}" no es un número válido`,
            );
          }
          detalle.monto = montoNumerico;

          let fechaIso: string | null;
          if (textoDeCelda(fecha)) {
            fechaIso = parseFechaCelda(fecha);
            if (!fechaIso) {
              throw new Error(
                `La fecha "${textoDeCelda(fecha)}" no es válida (use dd/mm/aaaa)`,
              );
            }
          } else {
            fechaIso = `${gestion}-01-01`;
            detalle.advertencias.push(
              'Sin fecha: se usó el 01/01 de la gestión',
            );
          }
          const fechaElaboracion = new Date(`${fechaIso}T12:00:00`);

          // Duplicados: en el archivo y en la base (misma gestión)
          const repetidos: string[] = [];
          for (const n of preventivosCelda) {
            const enBase = await this.dataSource.query(
              `SELECT 1 FROM c31_preventivos p JOIN comprobantes_c31 c ON c.id = p.comprobante_id
               WHERE c.gestion = $1 AND p.numero_preventivo = $2 LIMIT 1`,
              [gestion, n],
            );
            if (vistosPrev.has(n) || enBase.length) repetidos.push(`PREV ${n}`);
          }
          for (const n of devengadosCelda) {
            const enBase = await this.dataSource.query(
              `SELECT 1 FROM c31_devengados d JOIN comprobantes_c31 c ON c.id = d.comprobante_id
               WHERE c.gestion = $1 AND d.numero_devengado = $2 LIMIT 1`,
              [gestion, n],
            );
            if (vistosDev.has(n) || enBase.length) repetidos.push(`DEV ${n}`);
          }
          if (repetidos.length) {
            detalle.estado = 'DUPLICADO';
            const motivo = `Ya existe en la gestión ${gestion}: ${repetidos.join(', ')}`;
            detalle.advertencias.push(motivo);
            omitidos.push({ fila: r, motivo });
            continue;
          }
          preventivosCelda.forEach((n) => vistosPrev.add(n));
          devengadosCelda.forEach((n) => vistosDev.add(n));

          const cheques = textoDeCelda(cheque)
            .split(/[\s,;]+/)
            .map((s) => s.trim())
            .filter(Boolean);

          const beneficiarios = (textoDeCelda(beneficiario) || 'S/N')
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean);

          // Carpetas: "4-5-6" = el comprobante está en 3 carpetas (partes 1..3)
          const nc = numerosDeCelda(textoDeCelda(carpetaCelda));
          detalle.carpetas = nc.numeros;
          detalle.advertencias.push(...nc.advertencias);
          const textoUbicacion = textoDeCelda(ubicacion).slice(0, 150);
          const numeroFolio = textoDeCelda(folio) || undefined;
          const ubicacionFisica =
            textoUbicacion ||
            (nc.numeros.length ? `Carpeta ${nc.numeros.join('-')}` : undefined);
          const estadoNorm = normalizarEncabezado(textoDeCelda(estadoCelda));
          const anulado = estadoNorm.includes('ANULAD');
          // "No se encuentra en archivos" = comprobante perdido / extraviado
          const noEncontrado =
            !anulado &&
            /NOSEENCUENTRA|NOENCONTRAD|NOUBICAD|PERDID|EXTRAVIAD/.test(
              estadoNorm,
            );
          if (noEncontrado)
            detalle.advertencias.push(
              'Se marcará como "No se encuentra en archivos"',
            );
          const observaciones =
            [
              noEncontrado
                ? 'No se encuentra en archivos (según Excel importado)'
                : '',
              textoDeCelda(observacionesCelda),
            ]
              .filter(Boolean)
              .join(' · ') || undefined;

          if (simular) continue;

          await this.dataSource.transaction(async (manager) => {
            const catalogoImport = await this.beneficiariosService.catalogar(
              manager,
              beneficiarios,
              usuario.id,
            );
            const comprobante = manager.create(ComprobantesC31, {
              // Con al menos un preventivo es Con imputación; solo devengado, Sin imputación
              tipoC31: preventivosCelda.length
                ? TipoC31.CON_IMPUTACION
                : TipoC31.SIN_IMPUTACION,
              montoTotal: montoNumerico,
              fechaElaboracion: fechaElaboracion,
              descripcion: textoDeCelda(descripcion),
              numeroFolio,
              ubicacionFisica,
              observaciones,
              gestion,
              // Archivo histórico ya foliado y ubicado -> Archivado; si no, En archivo
              estadoFisico: anulado
                ? EstadoFisicoC31.ANULADO
                : noEncontrado
                  ? EstadoFisicoC31.NO_ENCONTRADO
                  : numeroFolio && ubicacionFisica
                    ? EstadoFisicoC31.ARCHIVADO
                    : EstadoFisicoC31.EN_ARCHIVO,
              creadoPorId: usuario.id,
              preventivos: preventivosCelda.map((numeroPreventivo) =>
                manager.create(C31Preventivo, { numeroPreventivo }),
              ),
              devengados: devengadosCelda.map((numeroDevengado) =>
                manager.create(C31Devengado, { numeroDevengado }),
              ),
              beneficiarios: beneficiarios.map((nombreBeneficiario) =>
                manager.create(C31Beneficiario, {
                  nombreBeneficiario,
                  beneficiarioId: catalogoImport.get(
                    claveNombre(nombreBeneficiario),
                  ),
                }),
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

            // Carpetas: se buscan por código <gestión>-<N°>; si no existen se crean
            for (let i = 0; i < nc.numeros.length; i++) {
              const codigo = codigoDeCarpeta(gestion, nc.numeros[i]);
              let carpeta = await manager.findOne(Carpeta, {
                where: { codigoCarpeta: codigo },
              });
              if (!carpeta) {
                carpeta = await manager.save(
                  Carpeta,
                  manager.create(Carpeta, {
                    codigoCarpeta: codigo,
                    ubicacionFisica: textoUbicacion || 'ARCHIVOS',
                  }),
                );
              }
              await manager.save(
                C31CarpetasUbicacion,
                manager.create(C31CarpetasUbicacion, {
                  comprobante: { id: guardado.id } as ComprobantesC31,
                  carpeta: { id: carpeta.id } as Carpeta,
                  numeroParte: i + 1,
                }),
              );
            }

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
                  observaciones: [
                    observaciones,
                    `Cheques del Excel: ${cheques.join(', ')}`,
                  ]
                    .filter(Boolean)
                    .join(' · '),
                });
              }
            }
          });

          creados++;
        } catch (err) {
          const motivo =
            err instanceof Error ? err.message : 'Error desconocido';
          detalle.estado = 'ERROR';
          detalle.advertencias.push(motivo);
          errores.push({ fila: r, motivo });
        }
      }
    }

    if (!hojasLeidas) {
      throw new BadRequestException(
        'No se encontró ninguna hoja con encabezados (Nº PREV o Nº DEV, BENEFICIARIO, DESCRIPCION, MONTO)',
      );
    }
    return {
      simulacion: simular,
      creados,
      omitidos,
      errores,
      filas,
      total: filas.length,
      porCrear: filas.filter((f) => f.estado === 'OK').length,
    };
  }
}

export interface FilaImportacion {
  fila: number;
  hoja: string;
  preventivos: string[];
  devengados: string[];
  carpetas: string[];
  monto: number | null;
  estado: 'OK' | 'DUPLICADO' | 'ERROR';
  advertencias: string[];
}

export interface ResultadoImportacion {
  simulacion: boolean;
  creados: number;
  omitidos: { fila: number; motivo: string }[];
  errores: { fila: number; motivo: string }[];
  filas: FilaImportacion[];
  total: number;
  porCrear: number;
}
