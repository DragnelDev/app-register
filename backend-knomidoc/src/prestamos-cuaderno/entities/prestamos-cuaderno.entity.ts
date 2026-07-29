import { BaseAuditoriaEntity } from 'src/common/entities/base-auditoria.entity';
import { ComprobantesC31 } from 'src/comprobantes_c31/entities/comprobantes_c31.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('prestamos_cuaderno')
export class PrestamosCuaderno extends BaseAuditoriaEntity {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @ManyToOne(() => ComprobantesC31)
  @JoinColumn({ name: 'comprobante_id' })
  comprobante: ComprobantesC31 | undefined;

  @Column({ type: 'int' })
  gestion: number | undefined;

  @Column({ name: 'quien_remite', type: 'varchar', length: 150 })
  quienRemite: string | undefined;

  @Column({ name: 'a_quien_se_presta', type: 'varchar', length: 150 })
  aQuienSePresta: string | undefined;

  @Column({
    name: 'fecha_entrega',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaEntrega: Date | undefined;

  @Column({
    name: 'estado_prestamo',
    type: 'varchar',
    length: 20,
    default: 'PRESTADO',
  })
  estadoPrestamo: string | undefined;
}
