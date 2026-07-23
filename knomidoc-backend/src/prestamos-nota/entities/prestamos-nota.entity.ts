import { PrestamosNotaDetalle } from 'src/prestamos-nota-detalle/entities/prestamos-nota-detalle.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('prestamos_nota')
export class PrestamosNota {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @Column({ name: 'numero_nota_solicitud', type: 'varchar', length: 100 })
  numeroNotaSolicitud: string | undefined;

  @Column({ name: 'unidad_solicitante', type: 'varchar', length: 150 })
  unidadSolicitante: string | undefined;

  @Column({ name: 'a_quien_se_presta', type: 'varchar', length: 150 })
  aQuienSePresta: string | undefined;

  @Column({
    name: 'estado_prestamo',
    type: 'varchar',
    length: 20,
    default: 'PRESTADO',
  })
  estadoPrestamo: string | undefined;

  @OneToMany(() => PrestamosNotaDetalle, (det) => det.prestamoNota, {
    cascade: true,
  })
  detalles: PrestamosNotaDetalle[] | undefined;
}
