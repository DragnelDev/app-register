import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ComprobantesC31 } from '../../comprobantes_c31/entities/comprobantes_c31.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export type OrigenCambioC31 =
  'REGISTRO' | 'MANUAL' | 'ACTA' | 'PRESTAMO' | 'SISTEMA' | 'MODIFICACION';

/** Bitácora de cambios de estado de cada comprobante (quién, cuándo y por qué). */
@Entity('c31_historial')
export class C31Historial {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @ManyToOne(() => ComprobantesC31, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'comprobante_id' })
  comprobante?: ComprobantesC31;

  @Column({ name: 'comprobante_id', type: 'integer' })
  comprobanteId: number | undefined;

  @Column({
    name: 'estado_anterior',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  estadoAnterior?: string | null;

  @Column({ name: 'estado_nuevo', type: 'varchar', length: 20 })
  estadoNuevo: string | undefined;

  /** REGISTRO | MANUAL | ACTA | PRESTAMO */
  @Column({ type: 'varchar', length: 20 })
  origen: OrigenCambioC31 | undefined;

  /** Motivo u observación del cambio. */
  @Column({ type: 'text', nullable: true })
  detalle?: string | null;

  /** Referencia legible: N° de acta, N° de nota, etc. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  referencia?: string | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Usuario;

  @Column({ name: 'usuario_id', type: 'integer', nullable: true })
  usuarioId?: number | null;

  @CreateDateColumn({ name: 'fecha' })
  fecha: Date | undefined;
}
