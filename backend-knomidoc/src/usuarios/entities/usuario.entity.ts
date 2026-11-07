import * as bcrypt from 'bcrypt';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UsuarioPerfil } from './usuario-perfil.entity';
import { BaseFechasEntity } from '../../common/entities/base-fechas.entity';
import { ROLES_USUARIO } from '../../common/constants/roles.constant';
import { ComprobantesC31 } from '../../comprobantes_c31/entities/comprobantes_c31.entity';
import { PrestamosCuaderno } from '../../prestamos-cuaderno/entities/prestamos-cuaderno.entity';

@Entity('usuarios')
export class Usuario extends BaseFechasEntity {
  validatePassword(passwordPlano: string): boolean {
    if (!this.password) {
      return false;
    }

    return bcrypt.compareSync(passwordPlano, this.password);
  }

  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @Column('varchar', { length: 50, unique: true })
  username: string | undefined;

  /** Hash bcrypt de la contraseña. Nunca se selecciona por defecto. */
  @Column('varchar', { length: 255, select: false })
  password: string | undefined;

  @Column('varchar', { length: 150, name: 'nombre_completo' })
  nombreCompleto: string | undefined;

  @Column('varchar', { length: 100, unique: true })
  email: string | undefined;

  @Column('varchar', { length: 100, nullable: true })
  cargo?: string;

  @Column('varchar', { length: 150, name: 'unidad_o_area', nullable: true })
  unidadOArea?: string;

  @Column('varchar', { length: 30, nullable: true })
  telefono?: string | null;

  /** Foto de perfil: URL http(s) o imagen reducida en data URL (base64). */
  @Column('text', { nullable: true })
  foto?: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    enum: [...ROLES_USUARIO],
  })
  rol: string | undefined;

  @Column('boolean', { default: true })
  activo: boolean | undefined;

  /** Perfiles que el usuario puede asumir (`rol` es el perfil por defecto). */
  @OneToMany(() => UsuarioPerfil, (p) => p.usuario)
  perfiles?: UsuarioPerfil[];

  /**
   * Perfil con el que trabaja en esta sesión (viene en el token). No se guarda:
   * lo completa la estrategia JWT en cada petición.
   */
  rolActivo?: string;

  /** Todos los perfiles disponibles (no se guarda; lo completa la estrategia JWT). */
  rolesDisponibles?: string[];

  /** El correo se confirmó con el código enviado (isEmailVerified). */
  @Column('boolean', { name: 'email_verificado', default: false })
  emailVerificado: boolean | undefined;

  @Column('timestamp', { name: 'email_verificado_en', nullable: true })
  emailVerificadoEn?: Date | null;

  /** Hash (SHA-256) del token de recuperación de contraseña vigente, si existe. */
  @Column('varchar', {
    length: 255,
    name: 'reset_password_token',
    nullable: true,
    select: false,
  })
  resetPasswordToken?: string | null;

  /** Vencimiento del token de recuperación de contraseña. */
  @Column('timestamp', {
    name: 'reset_password_expires',
    nullable: true,
    select: false,
  })
  resetPasswordExpires?: Date | null;

  /** Relación "registra": comprobantes C31 registrados por este usuario. */
  @OneToMany(() => ComprobantesC31, (c31) => c31.creadoPor)
  comprobantesRegistrados?: ComprobantesC31[];

  /** Relación "solicita": préstamos por cuaderno solicitados por este usuario. */
  @OneToMany(() => PrestamosCuaderno, (p) => p.solicitante)
  prestamosCuaderno?: PrestamosCuaderno[];
}
