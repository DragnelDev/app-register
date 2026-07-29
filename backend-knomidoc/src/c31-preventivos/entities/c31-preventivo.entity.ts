import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ComprobantesC31 } from '../../comprobantes_c31/entities/comprobantes_c31.entity';

@Entity('c31_preventivos')
export class C31Preventivo {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @ManyToOne(() => ComprobantesC31, (c31) => c31.preventivos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'comprobante_id' })
  comprobante: ComprobantesC31 | undefined;

  @Column({ name: 'numero_preventivo', type: 'varchar', length: 50 })
  numeroPreventivo: string | undefined;
}
