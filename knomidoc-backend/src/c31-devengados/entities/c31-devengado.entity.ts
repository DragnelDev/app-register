import { ComprobantesC31 } from 'src/comprobantes_c31/entities/comprobantes_c31.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('c31_devengados')
export class C31Devengado {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @ManyToOne(() => ComprobantesC31, (c31) => c31.devengados, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'comprobante_id' })
  comprobante: ComprobantesC31 | undefined;

  @Column({ name: 'numero_devengado', type: 'varchar', length: 50 })
  numeroDevengado: string | undefined;
}
