import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseAuditoriaEntity } from '../../common/entities/base-auditoria.entity';
import { Deposito } from '../../depositos/entities/deposito.entity';
import { Carpeta } from '../../carpetas/entities/carpeta.entity';

/** Estante dentro de un depósito de archivo. Contiene carpetas. */
@Entity('estantes')
export class Estante extends BaseAuditoriaEntity {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @Column({ type: 'varchar', length: 30, unique: true })
  codigo: string | undefined;

  @Column({ type: 'varchar', length: 150, nullable: true })
  descripcion?: string | null;

  /** Cantidad de niveles/repisas del estante (informativo). */
  @Column({ type: 'int', nullable: true })
  niveles?: number | null;

  @ManyToOne(() => Deposito, (d) => d.estantes, { nullable: false })
  @JoinColumn({ name: 'deposito_id' })
  deposito?: Deposito;

  @Column({ name: 'deposito_id', type: 'integer' })
  depositoId: number | undefined;

  @Column({ type: 'boolean', default: true })
  activo: boolean | undefined;

  @OneToMany(() => Carpeta, (c) => c.estante)
  carpetas?: Carpeta[];
}
