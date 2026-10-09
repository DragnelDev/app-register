import { C31CarpetasUbicacion } from 'src/c31-carpetas-ubicacion/entities/c31-carpetas-ubicacion.entity';
import { BaseAuditoriaEntity } from 'src/common/entities/base-auditoria.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Estante } from '../../estantes/entities/estante.entity';

@Entity('carpetas')
export class Carpeta extends BaseAuditoriaEntity {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @Column({ name: 'codigo_carpeta', type: 'varchar', length: 50, unique: true })
  codigoCarpeta: string | undefined;

  @Column({ name: 'ubicacion_fisica', type: 'varchar', length: 150 })
  ubicacionFisica: string | undefined;

  @Column({
    name: 'estado_fisico',
    type: 'varchar',
    length: 20,
    default: 'EN_ARCHIVO',
  })
  estadoFisico?: string;

  /** Estante donde se guarda físicamente la carpeta (opcional). */
  @ManyToOne(() => Estante, (e) => e.carpetas, { nullable: true })
  @JoinColumn({ name: 'estante_id' })
  estante?: Estante | null;

  @Column({ name: 'estante_id', type: 'integer', nullable: true })
  estanteId?: number | null;

  @OneToMany(() => C31CarpetasUbicacion, (ubic) => ubic.carpeta)
  comprobantesUbicacion?: C31CarpetasUbicacion[];
}
