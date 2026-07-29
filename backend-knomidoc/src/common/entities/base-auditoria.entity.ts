import {
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export abstract class BaseAuditoriaEntity {
  // --- Única relación de Auditoría ---
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'creado_por' })
  creadoPor?: Usuario;

  @Column({ name: 'creado_por_id', type: 'integer', nullable: true }) // O "integer" si tu ID es numérico
  creadoPorId?: number;

  // --- Fechas automáticas de TypeORM ---
  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date | undefined;

  @UpdateDateColumn({ name: 'fecha_modificacion' })
  fechaModificacion: Date | undefined;

  @DeleteDateColumn({ name: 'fecha_eliminacion' })
  fechaEliminacion: Date | undefined;
}
