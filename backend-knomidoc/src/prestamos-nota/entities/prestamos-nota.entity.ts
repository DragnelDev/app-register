import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ComprobantesC31 } from '../../comprobantes_c31/entities/comprobantes_c31.entity';
import { PrestamosNotaDetalle } from '../../prestamos-nota-detalle/entities/prestamos-nota-detalle.entity';

export enum EstadoPrestamoNota {
  ENTREGADO = 'ENTREGADO',
  DEVUELTO = 'DEVUELTO',
}

/**
 * Préstamo formal por nota de solicitud (ej. Auditoría Interna).
 * Cada fila presta un comprobante; una nota que pide varios comprobantes
 * genera una fila por comprobante con los mismos datos de la nota.
 */
@Entity('prestamos_nota')
export class PrestamosNota {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @ManyToOne(() => ComprobantesC31, (c31) => c31.prestamosNota, {
    nullable: false,
  })
  @JoinColumn({ name: 'comprobante_id' })
  comprobante?: ComprobantesC31;

  @Column({ name: 'comprobante_id', type: 'integer' })
  comprobanteId: number | undefined;

  @Column({ name: 'numero_nota_solicitud', type: 'varchar', length: 100 })
  numeroNotaSolicitud: string | undefined;

  /** Ej: Auditoría Interna */
  @Column({ name: 'institucion_solicitante', type: 'varchar', length: 150 })
  institucionSolicitante: string | undefined;

  @Column({ name: 'funcionario_responsable', type: 'varchar', length: 150 })
  funcionarioResponsable: string | undefined;

  @Column({
    name: 'fecha_prestamo',
    type: 'date',
    default: () => 'CURRENT_DATE',
  })
  fechaPrestamo: string | undefined;

  @Column({ name: 'fecha_devolucion_estimada', type: 'date', nullable: true })
  fechaDevolucionEstimada?: string | null;

  @Column({ name: 'fecha_devolucion_real', type: 'date', nullable: true })
  fechaDevolucionReal?: string | null;

  /** Entregado, Devuelto, etc. */
  @Column({
    name: 'estado_prestamo',
    type: 'varchar',
    length: 20,
    default: EstadoPrestamoNota.ENTREGADO,
  })
  estadoPrestamo: EstadoPrestamoNota | undefined;

  /** Control de daños o novedades del préstamo. */
  @Column({ type: 'text', nullable: true })
  observaciones?: string | null;

  @OneToMany(() => PrestamosNotaDetalle, (detalle) => detalle.prestamoNota)
  detalles?: PrestamosNotaDetalle[];
}
