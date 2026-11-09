import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { C31Beneficiario } from '../../c31-beneficiarios/entities/c31-beneficiario.entity';
import { C31Devengado } from '../../c31-devengados/entities/c31-devengado.entity';
import { C31Preventivo } from '../../c31-preventivos/entities/c31-preventivo.entity';
import { C31Pago } from '../../c31-pagos/entities/c31-pago.entity';
import { BaseAuditoriaEntity } from '../../common/entities/base-auditoria.entity';
import { ActasEntrega } from '../../actas-entrega/entities/actas-entrega.entity';
import { PrestamosNota } from '../../prestamos-nota/entities/prestamos-nota.entity';
import { PrestamosCuaderno } from '../../prestamos-cuaderno/entities/prestamos-cuaderno.entity';
import { C31CarpetasUbicacion } from '../../c31-carpetas-ubicacion/entities/c31-carpetas-ubicacion.entity';
import { C31Adjunto } from '../../uploads/entities/c31-adjunto.entity';

export enum TipoC31 {
  CON_IMPUTACION = 'CON_IMPUTACION',
  SIN_IMPUTACION = 'SIN_IMPUTACION',
}

/**
 * Estado del documento físico a lo largo de su recorrido:
 *  EN_TRAMITE  -> registrado en el sistema (reserva el correlativo), faltan firmas/sellos/respaldos.
 *  EN_REVISION -> firmado y completo en Contabilidad/Tesorería, listo para remitirse a Archivo.
 *  EN_ARCHIVO  -> ingresó físicamente a Archivo (acta de entrega recibida), en custodia del archivista.
 *  ARCHIVADO   -> verificado, foliado y ubicado en su lugar final (estante / caja / carpeta).
 *  PRESTADO    -> comprobante archivado retirado temporalmente (consulta o auditoría).
 *  OBSERVADO   -> inconsistencias o devolución por fallas en firmas/respaldos.
 *  ANULADO     -> revertido / dejado sin efecto en el SIGEP.
 */
export enum EstadoFisicoC31 {
  EN_TRAMITE = 'EN_TRAMITE',
  EN_REVISION = 'EN_REVISION',
  EN_ARCHIVO = 'EN_ARCHIVO',
  ARCHIVADO = 'ARCHIVADO',
  PRESTADO = 'PRESTADO',
  OBSERVADO = 'OBSERVADO',
  ANULADO = 'ANULADO',
  /** Comprobante que debería estar en archivo pero no se ubica físicamente (extraviado). */
  NO_ENCONTRADO = 'NO_ENCONTRADO',
}

export const ESTADOS_FISICO_C31 = Object.values(EstadoFisicoC31);

/** Etiquetas legibles de cada estado (uso en reportes/backoffice). */
export const ESTADO_FISICO_LABELS: Record<EstadoFisicoC31, string> = {
  [EstadoFisicoC31.EN_TRAMITE]: 'En trámite (incompleto)',
  [EstadoFisicoC31.EN_REVISION]: 'En revisión / firmado',
  [EstadoFisicoC31.EN_ARCHIVO]: 'En archivo',
  [EstadoFisicoC31.ARCHIVADO]: 'Archivado correctamente',
  [EstadoFisicoC31.PRESTADO]: 'Prestado',
  [EstadoFisicoC31.OBSERVADO]: 'Observado',
  [EstadoFisicoC31.ANULADO]: 'Revertido / anulado',
  [EstadoFisicoC31.NO_ENCONTRADO]: 'No se encuentra en archivos',
};

/**
 * Cambios de estado que se pueden pedir a mano (PATCH /comprobantes-c31/:id/estado).
 * Los demás pasos los hace el sistema:
 *  - EN_REVISION -> EN_ARCHIVO: al recibir el acta de entrega.
 *  - ARCHIVADO <-> PRESTADO: al registrar / devolver un préstamo.
 */
export const TRANSICIONES_MANUALES: Record<EstadoFisicoC31, EstadoFisicoC31[]> =
  {
    [EstadoFisicoC31.EN_TRAMITE]: [
      EstadoFisicoC31.EN_REVISION,
      EstadoFisicoC31.OBSERVADO,
      EstadoFisicoC31.ANULADO,
    ],
    [EstadoFisicoC31.EN_REVISION]: [
      EstadoFisicoC31.EN_TRAMITE,
      EstadoFisicoC31.OBSERVADO,
      EstadoFisicoC31.ANULADO,
    ],
    [EstadoFisicoC31.OBSERVADO]: [
      EstadoFisicoC31.EN_TRAMITE,
      EstadoFisicoC31.EN_REVISION,
      EstadoFisicoC31.ANULADO,
    ],
    [EstadoFisicoC31.EN_ARCHIVO]: [
      EstadoFisicoC31.ARCHIVADO,
      EstadoFisicoC31.NO_ENCONTRADO,
      EstadoFisicoC31.OBSERVADO,
      EstadoFisicoC31.ANULADO,
    ],
    [EstadoFisicoC31.ARCHIVADO]: [
      EstadoFisicoC31.NO_ENCONTRADO,
      EstadoFisicoC31.OBSERVADO,
      EstadoFisicoC31.ANULADO,
    ],
    [EstadoFisicoC31.PRESTADO]: [],
    [EstadoFisicoC31.ANULADO]: [],
    // Si aparece, vuelve a archivado (con folio y ubicación) o queda observado
    [EstadoFisicoC31.NO_ENCONTRADO]: [
      EstadoFisicoC31.ARCHIVADO,
      EstadoFisicoC31.OBSERVADO,
      EstadoFisicoC31.ANULADO,
    ],
  };

/**
 * Ubicación física que se asigna automáticamente cuando el archivo recibe el
 * acta de entrega: el comprobante pasa a "En archivo" en "ARCHIVOS GAMSL"
 * hasta que se ubique en su carpeta definitiva.
 */
export const UBICACION_ARCHIVO_DEFAULT = 'ARCHIVOS GAMSL';

@Entity('comprobantes_c31')
export class ComprobantesC31 extends BaseAuditoriaEntity {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  /** Relación "agrupa (lote de ingreso)". */
  @ManyToOne(() => ActasEntrega, (acta) => acta.comprobantesC31, {
    nullable: true,
  })
  @JoinColumn({ name: 'acta_entrega_id' })
  actaEntrega?: ActasEntrega;

  @Column({ name: 'acta_entrega_id', type: 'integer', nullable: true })
  actaEntregaId?: number | null;

  /**
   * Grupo de unión: los comprobantes que en la práctica vienen como uno solo
   * (PREV 3 + PREV 7, PREV + DEV) comparten este identificador. Cada uno
   * conserva su propio registro, monto y beneficiarios. Nulo = sin unir.
   */
  @Index()
  @Column({
    name: 'grupo_union_id',
    type: 'varchar',
    length: 36,
    nullable: true,
  })
  grupoUnionId?: string | null;

  /** Gestión (año): 2021, 2025, 2026... */
  @Column({ name: 'gestion', type: 'int' })
  gestion: number | undefined;

  @Column({
    name: 'tipo_c31',
    type: 'varchar',
    length: 20,
    default: TipoC31.CON_IMPUTACION,
  })
  tipoC31: TipoC31 | undefined;

  /** Nulo mientras el comprobante está incompleto (solo registrado con su N°). */
  @Column({
    name: 'monto_total',
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  montoTotal?: number | null;

  @Column({ name: 'fecha_elaboracion', type: 'date', nullable: true })
  fechaElaboracion?: Date | null;

  @Column({ type: 'text', nullable: true })
  descripcion?: string | null;

  /** Folio individual por comprobante. */
  @Column({ name: 'numero_folio', type: 'varchar', length: 50, nullable: true })
  numeroFolio?: string | null;

  @Column({
    name: 'estado_fisico',
    type: 'varchar',
    length: 20,
    default: EstadoFisicoC31.EN_TRAMITE,
  })
  estadoFisico: EstadoFisicoC31 | undefined;

  @Column({
    name: 'ubicacion_fisica',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  ubicacionFisica?: string | null;

  /** Detalles del estado físico del comprobante (daños, faltantes, motivo de observación, etc.). */
  @Column({ type: 'text', nullable: true })
  observaciones?: string | null;

  /**
   * PDF escaneado principal del C31 (ruta del endpoint autenticado que lo
   * sirve). Nulo = pendiente de digitalizar.
   */
  @Column({ name: 'archivo_adjunto_url', type: 'text', nullable: true })
  archivoAdjuntoUrl?: string | null;

  @Column({ name: 'fecha_digitalizacion', type: 'timestamp', nullable: true })
  fechaDigitalizacion?: Date | null;

  /** Todos los archivos digitalizados (C31 escaneado y respaldos). */
  @OneToMany(() => C31Adjunto, (a) => a.comprobante)
  adjuntos?: C31Adjunto[];

  // Un comprobante puede tener varios identificadores preventivo/devengado.
  @OneToMany(() => C31Preventivo, (prev) => prev.comprobante, {
    cascade: true,
  })
  preventivos?: C31Preventivo[];

  @OneToMany(() => C31Devengado, (dev) => dev.comprobante, { cascade: true })
  devengados?: C31Devengado[];

  // Relaciones 1:N
  @OneToMany(() => C31Beneficiario, (ben) => ben.comprobante, { cascade: true })
  beneficiarios: C31Beneficiario[] | undefined;

  /** Pagos del comprobante (cheque o pago electrónico), ligados a un beneficiario. */
  @OneToMany(() => C31Pago, (pago) => pago.comprobante)
  pagos?: C31Pago[];

  @OneToMany(() => PrestamosNota, (p) => p.comprobante)
  prestamosNota?: PrestamosNota[];

  @OneToMany(() => PrestamosCuaderno, (p) => p.comprobante)
  prestamosCuaderno?: PrestamosCuaderno[];

  @OneToMany(() => C31CarpetasUbicacion, (ubic) => ubic.comprobante)
  carpetasUbicacion?: C31CarpetasUbicacion[];
}
