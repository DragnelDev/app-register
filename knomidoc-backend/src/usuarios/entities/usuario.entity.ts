import { BaseAuditoriaEntity } from '../../common/entities/base-auditoria.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { NotasEntrega } from '../../notas-entrega/entities/notas-entrega.entity';
@Entity('usuarios')
export class Usuario extends BaseAuditoriaEntity {
  validatePassword(passwordPlano: string): boolean {
    if (!this.passwordHash) {
      return false;
    }

    return this.passwordHash === passwordPlano;
  }
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @Column('varchar', { length: 150, name: 'nombre_completo' })
  nombreCompleto: string | undefined;

  @Column('varchar', { length: 100, unique: true })
  email: string | undefined;

  @Column('varchar', { length: 255, name: 'password_hash' })
  passwordHash: string | undefined;

  @Column({
    type: 'varchar',
    length: 30,
    enum: ['ADMIN', 'REGISTRADOR', 'CONSULTA'],
  })
  rol: string | undefined;

  /*@Column()
  ultimoLogin: Date;*/

  @Column('boolean', { default: true })
  estado: boolean | undefined;

  @OneToMany(() => NotasEntrega, (nota) => nota.creadoPor)
  notasEntrega: NotasEntrega[] | undefined;
}
