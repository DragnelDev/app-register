import { ComprobantesC31 } from 'src/comprobantes_c31/entities/comprobantes_c31.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('c31_cheques')
export class C31Cheque {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @ManyToOne(() => ComprobantesC31, (c31) => c31.cheques, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'comprobante_id' })
  comprobante: ComprobantesC31 | undefined;

  @Column({ name: 'numero_cheque', type: 'varchar', length: 50 })
  numeroCheque: string | undefined;
}
