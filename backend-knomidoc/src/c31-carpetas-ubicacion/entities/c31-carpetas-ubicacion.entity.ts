import { Carpeta } from 'src/carpetas/entities/carpeta.entity';
import { ComprobantesC31 } from 'src/comprobantes_c31/entities/comprobantes_c31.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('c31_carpetas_ubicacion')
export class C31CarpetasUbicacion {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @ManyToOne(() => ComprobantesC31, (c31) => c31.carpetasUbicacion, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'comprobante_id' })
  comprobante: ComprobantesC31 | undefined;

  @ManyToOne(() => Carpeta, (carp) => carp.comprobantesUbicacion, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'carpeta_id' })
  carpeta: Carpeta | undefined;

  @Column({ name: 'numero_parte', type: 'int' })
  numeroParte: number | undefined;
}
