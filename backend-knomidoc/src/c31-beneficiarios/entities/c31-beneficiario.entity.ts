import { ComprobantesC31 } from '../../comprobantes_c31/entities/comprobantes_c31.entity';
import { C31Pago } from '../../c31-pagos/entities/c31-pago.entity';
import { Beneficiario } from '../../beneficiarios/entities/beneficiario.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
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

  /** Nombre tal como se registró en este comprobante. */
  @Column({ name: 'nombre_beneficiario', type: 'varchar', length: 200 })
  nombreBeneficiario: string | undefined;

  /** Beneficiario del directorio (con CI/NIT) al que corresponde. */
  @ManyToOne(() => Beneficiario, { nullable: true })
  @JoinColumn({ name: 'beneficiario_id' })
  beneficiario?: Beneficiario | null;

  @Index()
  @Column({ name: 'beneficiario_id', type: 'integer', nullable: true })
  beneficiarioId?: number | null;

  /** Un beneficiario puede tener uno o muchos pagos. */
  @OneToMany(() => C31Pago, (pago) => pago.beneficiario)
  pagos?: C31Pago[];
}
