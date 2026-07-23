import { Carpeta } from 'src/carpetas/entities/carpeta.entity';
import { ComprobantesC31 } from 'src/comprobantes_c31/entities/comprobantes_c31.entity';
import { PrestamosNota } from 'src/prestamos-nota/entities/prestamos-nota.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('prestamos_nota_detalle')
export class PrestamosNotaDetalle {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @ManyToOne(() => PrestamosNota, (pn) => pn.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prestamo_nota_id' })
  prestamoNota: PrestamosNota | undefined;

  @ManyToOne(() => ComprobantesC31, { nullable: true })
  @JoinColumn({ name: 'comprobante_id' })
  comprobante?: ComprobantesC31;

  @ManyToOne(() => Carpeta, { nullable: true })
  @JoinColumn({ name: 'carpeta_id' })
  carpeta?: Carpeta;

  @Column({
    name: 'estado_item',
    type: 'varchar',
    length: 20,
    default: 'PRESTADO',
  })
  estadoItem: string | undefined;
}
