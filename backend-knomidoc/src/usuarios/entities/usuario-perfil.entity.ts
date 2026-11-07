import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';

/** Perfil (rol) que un usuario puede asumir. Un usuario puede tener varios. */
@Entity('usuario_perfiles')
@Index(['usuarioId', 'rol'], { unique: true })
export class UsuarioPerfil {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @ManyToOne(() => Usuario, (u) => u.perfiles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Usuario;

  @Column({ name: 'usuario_id', type: 'integer' })
  usuarioId: number | undefined;

  @Column({ type: 'varchar', length: 30 })
  rol: string | undefined;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion?: Date;
}
