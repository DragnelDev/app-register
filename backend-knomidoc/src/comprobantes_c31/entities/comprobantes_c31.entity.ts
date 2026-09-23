import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { C31Beneficiario } from '../../c31-beneficiarios/entities/c31-beneficiario.entity';
import { C31Devengado } from '../../c31-devengados/entities/c31-devengado.entity';
import { C31Preventivo } from '../../c31-preventivos/entities/c31-preventivo.entity';
import { C31Cheque } from '../../c31-cheques/entities/c31-cheque.entity';
import { BaseAuditoriaEntity } from '../../common/entities/base-auditoria.entity';
import { ActasEntrega } from '../../actas-entrega/entities/actas-entrega.entity';
import { PrestamosNota } from '../../prestamos-nota/entities/prestamos-nota.entity';
import { PrestamosCuaderno } from '../../prestamos-cuaderno/entities/prestamos-cuaderno.entity';
import { C31CarpetasUbicacion } from '../../c31-carpetas-ubicacion/entities/c31-carpetas-ubicacion.entity';

export enum TipoC31 {
  CON_IMPUTACION = 'CON_IMPUTACION',
  SIN_IMPUTACION = 'SIN_IMPUTACION',
}

/** Estado físico del comprobante: En Trámite/Revisión, En Archivo, Prestado, Anulado. */
export enum EstadoFisicoC31 {
  /** Comprobante recién registrado, aún no entregado/archivado formalmente. */
  EN_TRAMITE = 'EN_TRAMITE',
  EN_ARCHIVO = 'EN_ARCHIVO',
  PRESTADO = 'PRESTADO',
  ANULADO = 'ANULADO',
}

/** Etiquetas legibles de cada estado físico (uso en reportes/backoffice). */
export const ESTADO_FISICO_LABELS: Record<EstadoFisicoC31, string> = {
  [EstadoFisicoC31.EN_TRAMITE]: 'En Trámite / Revisión',
  [EstadoFisicoC31.EN_ARCHIVO]: 'En archivo',
  [EstadoFisicoC31.PRESTADO]: 'Prestado',
  [EstadoFisicoC31.ANULADO]: 'Anulado',
};

/**
 * Ubicación física que se asigna automáticamente a un comprobante cuando se
 * vincula a un acta de entrega (RN: al recibirse el acta, el comprobante
 * pasa a "En archivo" y queda ubicado físicamente en "ARCHIVOS GAMSL").
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

  @Column({
    name: 'numero_comprobante',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  numeroComprobante?: string | null;

  @Column({ name: 'monto_total', type: 'decimal', precision: 14, scale: 2 })
  montoTotal: number | undefined;

  @Column({ name: 'fecha_elaboracion', type: 'date' })
  fechaElaboracion: Date | undefined;

  @Column({ type: 'text' })
  descripcion: string | undefined;

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

  /** Detalles del estado físico del comprobante (daños, faltantes, etc.). */
  @Column({ type: 'text', nullable: true })
  observaciones?: string | null;

  // Relaciones 1:N
  @OneToMany(() => C31Preventivo, (prev) => prev.comprobante, { cascade: true })
  preventivos: C31Preventivo[] | undefined;

  @OneToMany(() => C31Devengado, (dev) => dev.comprobante, { cascade: true })
  devengados: C31Devengado[] | undefined;

  @OneToMany(() => C31Beneficiario, (ben) => ben.comprobante, { cascade: true })
  beneficiarios: C31Beneficiario[] | undefined;

  @OneToMany(() => C31Cheque, (chq) => chq.comprobante, { cascade: true })
  cheques: C31Cheque[] | undefined;

  @OneToMany(() => PrestamosNota, (p) => p.comprobante)
  prestamosNota?: PrestamosNota[];

  @OneToMany(() => PrestamosCuaderno, (p) => p.comprobante)
  prestamosCuaderno?: PrestamosCuaderno[];

  @OneToMany(() => C31CarpetasUbicacion, (ubic) => ubic.comprobante)
  carpetasUbicacion?: C31CarpetasUbicacion[];
}
