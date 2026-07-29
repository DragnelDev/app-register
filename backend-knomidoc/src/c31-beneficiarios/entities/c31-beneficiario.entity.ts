import { ComprobantesC31 } from 'src/comprobantes_c31/entities/comprobantes_c31.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('c31_beneficiarios')
export class C31Beneficiario {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @ManyToOne(() => ComprobantesC31, (c31) => c31.beneficiarios, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'comprobante_id' })
  comprobante: ComprobantesC31 | undefined;

  @Column({ name: 'nombre_beneficiario', type: 'varchar', length: 200 })
  nombreBeneficiario: string | undefined;
}
