import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseAuditoriaEntity } from '../../common/entities/base-auditoria.entity';
import { Estante } from '../../estantes/entities/estante.entity';

/** Depósito de archivo: ambiente físico que contiene estantes. */
@Entity('depositos')
export class Deposito extends BaseAuditoriaEntity {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @Column({ type: 'varchar', length: 30, unique: true })
  codigo: string | undefined;

  @Column({ type: 'varchar', length: 120 })
  nombre: string | undefined;

  /** Edificio, piso, ambiente. */
  @Column({ type: 'varchar', length: 150, nullable: true })
  ubicacion?: string | null;

  @Column({ type: 'text', nullable: true })
  descripcion?: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean | undefined;

  @OneToMany(() => Estante, (e) => e.deposito)
  estantes?: Estante[];
}
