import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ComprobantesC31 } from '../../comprobantes_c31/entities/comprobantes_c31.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Funcionario } from '../../funcionarios/entities/funcionario.entity';
import { PrestamosNotaDetalle } from '../../prestamos-nota-detalle/entities/prestamos-nota-detalle.entity';

export enum EstadoPrestamoNota {
  /** Nota en edición/previsualización: aún no sale el comprobante del archivo. */
  BORRADOR = 'BORRADOR',
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

  /** Funcionario/autoridad que solicita y recibe los documentos. */
  @ManyToOne(() => Funcionario, { nullable: true })
  @JoinColumn({ name: 'funcionario_id' })
  funcionario?: Funcionario;

  @Column({ name: 'funcionario_id', type: 'integer', nullable: true })
  funcionarioId?: number | null;

  /**
   * Copia (snapshot) de la unidad y del nombre del funcionario al momento de la
   * nota, para que el historial y el PDF no cambien si luego se edita el
   * directorio. En registros anteriores al directorio es el único dato.
   */
  @Column({
    name: 'institucion_solicitante',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  institucionSolicitante?: string | null;

  @Column({
    name: 'funcionario_responsable',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  funcionarioResponsable?: string | null;

  /** Referencia / glosa de la nota (editable antes de aprobar). */
  @Column({ type: 'text', nullable: true })
  referencia?: string | null;

  /** Destinatario impreso en la nota (por defecto, el funcionario). */
  @Column({ type: 'varchar', length: 200, nullable: true })
  destinatario?: string | null;

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
    default: EstadoPrestamoNota.BORRADOR,
  })
  estadoPrestamo: EstadoPrestamoNota | undefined;

  /** Control de daños o novedades del préstamo. */
  @Column({ type: 'text', nullable: true })
  observaciones?: string | null;

  @OneToMany(() => PrestamosNotaDetalle, (detalle) => detalle.prestamoNota)
  detalles?: PrestamosNotaDetalle[];

  /** Usuario del sistema que registró la salida del comprobante. */
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'registrado_por_id' })
  registradoPor?: Usuario;

  @Column({ name: 'registrado_por_id', type: 'integer', nullable: true })
  registradoPorId?: number | null;

  /** Usuario que recibió el comprobante al devolverse. */
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'recibido_por_id' })
  recibidoPor?: Usuario;

  @Column({ name: 'recibido_por_id', type: 'integer', nullable: true })
  recibidoPorId?: number | null;

  /** Estado en que volvió el comprobante: CONFORME o CON_NOVEDAD (daños, faltantes). */
  @Column({
    name: 'condicion_devolucion',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  condicionDevolucion?: string | null;

  /** Observaciones hechas al recibir la devolución (las de la salida quedan en `observaciones`). */
  @Column({ name: 'observaciones_devolucion', type: 'text', nullable: true })
  observacionesDevolucion?: string | null;
}
