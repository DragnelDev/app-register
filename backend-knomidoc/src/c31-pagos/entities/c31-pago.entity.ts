import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ComprobantesC31 } from '../../comprobantes_c31/entities/comprobantes_c31.entity';
import { C31Beneficiario } from '../../c31-beneficiarios/entities/c31-beneficiario.entity';
import { BaseAuditoriaEntity } from '../../common/entities/base-auditoria.entity';

export enum TipoPago {
  CHEQUE = 'CHEQUE',
  ELECTRONICO = 'ELECTRONICO',
}

export enum EstadoPago {
  PENDIENTE = 'PENDIENTE',
  PAGADO = 'PAGADO',
  ANULADO = 'ANULADO',
}

export const TIPOS_PAGO = Object.values(TipoPago);
export const ESTADOS_PAGO = Object.values(EstadoPago);

const decimalANumero = {
  to: (v?: number | null) => v,
  from: (v?: string | null) =>
    v === null || v === undefined ? null : Number(v),
};

/**
 * Pago de un comprobante C31 a uno de sus beneficiarios, por cheque o por
 * pago electrónico. Un beneficiario puede tener uno o muchos pagos. El monto
 * total del comprobante es aparte (incluye impuestos, retenciones, etc.).
 */
@Entity('c31_pagos')
export class C31Pago extends BaseAuditoriaEntity {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @ManyToOne(() => ComprobantesC31, (c31) => c31.pagos, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'comprobante_id' })
  comprobante?: ComprobantesC31;

  @Column({ name: 'comprobante_id', type: 'integer' })
  comprobanteId: number | undefined;

  @ManyToOne(() => C31Beneficiario, (b) => b.pagos, {
    onDelete: 'RESTRICT',
    nullable: false,
  })
  @JoinColumn({ name: 'beneficiario_id' })
  beneficiario?: C31Beneficiario;

  @Column({ name: 'beneficiario_id', type: 'integer' })
  beneficiarioId: number | undefined;

  @Column({ name: 'tipo_pago', type: 'varchar', length: 20 })
  tipoPago: TipoPago | undefined;

  /** N° de cheque, o N° de transferencia / comprobante del pago electrónico. */
  @Column({
    name: 'numero_documento',
    type: 'varchar',
    length: 60,
    nullable: true,
  })
  numeroDocumento?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  banco?: string | null;

  /** Nulo solo en registros migrados de cheques sin monto conocido. */
  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
    transformer: decimalANumero,
  })
  monto?: number | null;

  @Column({ name: 'fecha_pago', type: 'date', nullable: true })
  fechaPago?: string | null;

  @Column({
    name: 'estado_pago',
    type: 'varchar',
    length: 20,
    default: EstadoPago.PENDIENTE,
  })
  estadoPago: EstadoPago | undefined;

  @Column({ type: 'text', nullable: true })
  observaciones?: string | null;
}
