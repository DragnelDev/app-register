import { CreateDateColumn, DeleteDateColumn, UpdateDateColumn } from 'typeorm';

/** Columnas de fecha comunes (fecha_creacion, fecha_modificacion, fecha_eliminacion). */
export abstract class BaseFechasEntity {
  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date | undefined;

  @UpdateDateColumn({ name: 'fecha_modificacion' })
  fechaModificacion: Date | undefined;

  @DeleteDateColumn({ name: 'fecha_eliminacion' })
  fechaEliminacion: Date | undefined;
}
