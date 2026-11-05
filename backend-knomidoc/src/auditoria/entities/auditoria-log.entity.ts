import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Bitácora de acciones: quién hizo qué y cuándo. Se alimenta automáticamente
 * desde el AuditoriaInterceptor para toda operación que modifica datos.
 * No lleva soft-delete ni relaciones: es un registro histórico inmutable.
 */
@Entity('auditoria_logs')
@Index(['fecha'])
@Index(['entidad'])
export class AuditoriaLog {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @CreateDateColumn({ type: 'timestamp' })
  fecha: Date | undefined;

  @Column({ name: 'usuario_id', type: 'integer', nullable: true })
  usuarioId?: number | null;

  /** Copia del nombre/usuario al momento de la acción (el usuario puede cambiar o borrarse). */
  @Column({
    name: 'usuario_nombre',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  usuarioNombre?: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  rol?: string | null;

  /** CREAR | ACTUALIZAR | ELIMINAR | LOGIN | IMPORTAR | DEVOLVER | ACTIVAR ... */
  @Column({ type: 'varchar', length: 30 })
  accion: string | undefined;

  /** Recurso afectado (primer segmento de la ruta): comprobantes-c31, carpetas, usuarios... */
  @Column({ type: 'varchar', length: 60 })
  entidad: string | undefined;

  @Column({ name: 'registro_id', type: 'varchar', length: 40, nullable: true })
  registroId?: string | null;

  @Column({ type: 'varchar', length: 8 })
  metodo: string | undefined;

  @Column({ type: 'varchar', length: 255 })
  ruta: string | undefined;

  @Column({ type: 'varchar', length: 60, nullable: true })
  ip?: string | null;

  /** Cuerpo de la petición sin datos sensibles (contraseñas, tokens). */
  @Column({ type: 'jsonb', nullable: true })
  detalle?: Record<string, unknown> | null;
}
