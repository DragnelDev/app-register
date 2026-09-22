import * as bcrypt from 'bcrypt';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
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

  @Column({
    type: 'varchar',
    length: 30,
    enum: [...ROLES_USUARIO],
  })
  rol: string | undefined;

  @Column('boolean', { default: true })
  activo: boolean | undefined;

  /** Relación "registra": comprobantes C31 registrados por este usuario. */
  @OneToMany(() => ComprobantesC31, (c31) => c31.creadoPor)
  comprobantesRegistrados?: ComprobantesC31[];

  /** Relación "solicita": préstamos por cuaderno solicitados por este usuario. */
  @OneToMany(() => PrestamosCuaderno, (p) => p.solicitante)
  prestamosCuaderno?: PrestamosCuaderno[];
}
