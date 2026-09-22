import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ComprobantesC31 } from '../../comprobantes_c31/entities/comprobantes_c31.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum MetodoVerificacion {
  FIRMA_MANUAL = 'FIRMA_MANUAL',
  /** Reservado para una fase futura (huella digital). */
  HUELLA_DIGITAL = 'HUELLA_DIGITAL',
}

/** Préstamo rápido, registrado en el cuaderno de control de salida. */
@Entity('prestamos_cuaderno')
export class PrestamosCuaderno {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @ManyToOne(() => ComprobantesC31, (c31) => c31.prestamosCuaderno, {
    nullable: false,
  })
  @JoinColumn({ name: 'comprobante_id' })
  comprobante?: ComprobantesC31;

  @Column({ name: 'comprobante_id', type: 'integer' })
  comprobanteId: number | undefined;

  /** Relación "solicita": usuario que solicita el comprobante. */
  @ManyToOne(() => Usuario, (u) => u.prestamosCuaderno, { nullable: false })
  @JoinColumn({ name: 'solicitante_id' })
  solicitante?: Usuario;

  @Column({ name: 'solicitante_id', type: 'integer' })
  solicitanteId: number | undefined;

  @Column({ name: 'area_unidad', type: 'varchar', length: 150 })
  areaUnidad: string | undefined;

  @Column({
    name: 'fecha_hora_salida',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaHoraSalida: Date | undefined;

  @Column({ name: 'fecha_hora_devolucion', type: 'timestamp', nullable: true })
  fechaHoraDevolucion?: Date | null;

  @Column({ type: 'boolean', default: false })
  devuelto: boolean | undefined;

  @Column({
    name: 'metodo_verificacion',
    type: 'varchar',
    length: 20,
    default: MetodoVerificacion.FIRMA_MANUAL,
  })
  metodoVerificacion: MetodoVerificacion | undefined;

  /** Log biométrico o firma (futuro). */
  @Column({
    name: 'evidencia_verificacion_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  evidenciaVerificacionUrl?: string | null;

  @Column({ type: 'text', nullable: true })
  observaciones?: string | null;
}
