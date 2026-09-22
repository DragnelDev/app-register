import { Column, JoinColumn, ManyToOne } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { BaseFechasEntity } from './base-fechas.entity';

/**
 * Fechas + usuario que registró el registro (relación "registra" del DER:
 * USUARIOS 1 ── N COMPROBANTES_C31, columna creado_por_id).
 */
export abstract class BaseAuditoriaEntity extends BaseFechasEntity {
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'creado_por_id' })
  creadoPor?: Usuario;

  @Column({ name: 'creado_por_id', type: 'integer', nullable: true })
  creadoPorId?: number;
}
