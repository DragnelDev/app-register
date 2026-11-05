import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type PropositoCodigo = 'EMAIL_VERIFICACION' | 'RECUPERACION_PASSWORD';

/**
 * Código numérico de un solo uso enviado por correo (verificación del correo
 * y recuperación de contraseña). Solo se guarda su hash, nunca el código.
 */
@Entity('codigos_verificacion')
@Index(['usuarioId', 'proposito'])
export class CodigoVerificacion {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @Column({ name: 'usuario_id', type: 'integer' })
  usuarioId: number | undefined;

  @Column({ type: 'varchar', length: 30 })
  proposito: PropositoCodigo | undefined;

  /** Correo al que se envió; si el usuario lo cambia, el código deja de servir. */
  @Column({ type: 'varchar', length: 100 })
  email: string | undefined;

  @Column({ name: 'codigo_hash', type: 'varchar', length: 64 })
  codigoHash: string | undefined;

  @Column({ type: 'timestamp' })
  expira: Date | undefined;

  @Column({ type: 'integer', default: 0 })
  intentos: number | undefined;

  @Column({ type: 'boolean', default: false })
  usado: boolean | undefined;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date | undefined;
}
