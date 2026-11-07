import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { ComprobantesC31 } from '../../comprobantes_c31/entities/comprobantes_c31.entity';

/**
 * Ciclo de vida del acta:
 *  BORRADOR -> se está armando; los comprobantes seleccionados siguen "En revisión".
 *  RECIBIDA -> el archivo verificó y aprobó la recepción: los comprobantes recibidos
 *              pasan a "En archivo" y los observados vuelven con su motivo.
 *  ANULADA  -> acta dejada sin efecto antes de recibirse.
 */
export enum EstadoActa {
  BORRADOR = 'BORRADOR',
  RECIBIDA = 'RECIBIDA',
  ANULADA = 'ANULADA',
}

/** Acta de entrega de comprobantes desde Tesorería (lote de ingreso). */
@Entity('actas_entrega')
export class ActasEntrega {
  @PrimaryGeneratedColumn('identity')
  id?: number;

  @Column('varchar', { length: 50, name: 'numero_acta', unique: true })
  numeroActa?: string;

  @Column('varchar', {
    length: 100,
    name: 'unidad_emisora',
    default: 'Tesorería',
  })
  unidadEmisora?: string;

  @Column('varchar', { length: 150, name: 'responsable_entrega' })
  responsableEntrega?: string;

  @Column('varchar', { length: 150, name: 'responsable_recepcion' })
  responsableRecepcion?: string;

  /** Se mantiene sincronizada con los comprobantes vinculados al acta. */
  @Column('int', { name: 'cantidad_comprobantes', default: 0 })
  cantidadComprobantes?: number;

  @Column('date', { name: 'fecha_recepcion' })
  fechaRecepcion?: string;

  @Column('text', { nullable: true })
  observaciones?: string;

  /** Relación "agrupa (lote de ingreso)": 1 acta ── N comprobantes C31. */
  @OneToMany(() => ComprobantesC31, (c31) => c31.actaEntrega)
  comprobantesC31?: ComprobantesC31[];

  @Column({
    type: 'varchar',
    length: 20,
    default: EstadoActa.BORRADOR,
  })
  estado?: EstadoActa;

  /** Cuándo y quién aprobó la recepción en Archivo. */
  @Column('timestamp', { name: 'fecha_aprobacion', nullable: true })
  fechaAprobacion?: Date | null;

  /** Quién armó el acta (p. ej. el remitente de C31). */
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'creado_por_id' })
  creadoPor?: Usuario;

  @Column({ name: 'creado_por_id', type: 'integer', nullable: true })
  creadoPorId?: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'aprobado_por_id' })
  aprobadoPor?: Usuario;

  @Column({ name: 'aprobado_por_id', type: 'integer', nullable: true })
  aprobadoPorId?: number | null;
}
