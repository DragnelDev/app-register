import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseAuditoriaEntity } from '../../common/entities/base-auditoria.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { ComprobantesC31 } from '../../comprobantes_c31/entities/comprobantes_c31.entity';

export const ESTADOS_REMISION = [
  'BORRADOR',
  'ENVIADA',
  'RECIBIDA',
  'OBSERVADA',
] as const;
export type EstadoRemision = (typeof ESTADOS_REMISION)[number];

/** Remisión de comprobantes C31 de un área remitente hacia el Archivo. */
@Entity('remisiones')
export class Remision extends BaseAuditoriaEntity {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @Column({
    name: 'numero_remision',
    type: 'varchar',
    length: 20,
    unique: true,
  })
  numeroRemision: string | undefined;

  @Column({ type: 'int' })
  gestion: number | undefined;

  @Column({ type: 'varchar', length: 12, default: 'BORRADOR' })
  estado: EstadoRemision | undefined;

  @Column({
    name: 'unidad_remitente',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  unidadRemitente?: string | null;

  @Column({ type: 'text', nullable: true })
  observacion?: string | null;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'remitente_id' })
  remitente?: Usuario;

  @Column({ name: 'remitente_id', type: 'integer' })
  remitenteId: number | undefined;

  @Column({ name: 'fecha_envio', type: 'timestamp', nullable: true })
  fechaEnvio?: Date | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'receptor_id' })
  receptor?: Usuario;

  @Column({ name: 'receptor_id', type: 'integer', nullable: true })
  receptorId?: number | null;

  @Column({ name: 'fecha_recepcion', type: 'timestamp', nullable: true })
  fechaRecepcion?: Date | null;

  @Column({ name: 'observacion_recepcion', type: 'text', nullable: true })
  observacionRecepcion?: string | null;

  @OneToMany(() => RemisionItem, (i) => i.remision, { cascade: false })
  items?: RemisionItem[];
}

@Entity('remision_items')
export class RemisionItem {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @ManyToOne(() => Remision, (r) => r.items, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'remision_id' })
  remision?: Remision;

  @Column({ name: 'remision_id', type: 'integer' })
  remisionId: number | undefined;

  @ManyToOne(() => ComprobantesC31, { nullable: false })
  @JoinColumn({ name: 'comprobante_id' })
  comprobante?: ComprobantesC31;

  @Column({ name: 'comprobante_id', type: 'integer' })
  comprobanteId: number | undefined;

  /** Resultado de la recepción: null = pendiente. */
  @Column({ type: 'boolean', nullable: true })
  recibido?: boolean | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  observacion?: string | null;
}
