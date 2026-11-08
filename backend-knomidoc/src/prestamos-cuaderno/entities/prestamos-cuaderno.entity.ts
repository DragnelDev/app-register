import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ComprobantesC31 } from '../../comprobantes_c31/entities/comprobantes_c31.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Funcionario } from '../../funcionarios/entities/funcionario.entity';

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

  /**
   * Salida conjunta: los comprobantes prestados en un mismo registro comparten
   * lote y se devuelven todos juntos. Nulo en préstamos anteriores a esta regla.
   */
  @Index()
  @Column({ name: 'lote_id', type: 'varchar', length: 36, nullable: true })
  loteId?: string | null;

  @ManyToOne(() => ComprobantesC31, (c31) => c31.prestamosCuaderno, {
    nullable: false,
  })
  @JoinColumn({ name: 'comprobante_id' })
  comprobante?: ComprobantesC31;

  @Column({ name: 'comprobante_id', type: 'integer' })
  comprobanteId: number | undefined;

  /** Funcionario del directorio que solicita y recibe el comprobante. */
  @ManyToOne(() => Funcionario, { nullable: true })
  @JoinColumn({ name: 'funcionario_id' })
  funcionario?: Funcionario;

  @Column({ name: 'funcionario_id', type: 'integer', nullable: true })
  funcionarioId?: number | null;

  /**
   * Solo registros anteriores al directorio de funcionarios (el solicitante era
   * un Usuario del sistema). Los préstamos nuevos usan `funcionario`.
   */
  @ManyToOne(() => Usuario, (u) => u.prestamosCuaderno, { nullable: true })
  @JoinColumn({ name: 'solicitante_id' })
  solicitante?: Usuario | null;

  @Column({ name: 'solicitante_id', type: 'integer', nullable: true })
  solicitanteId?: number | null;

  @Column({ name: 'area_unidad', type: 'varchar', length: 150 })
  areaUnidad: string | undefined;

  @Column({
    name: 'fecha_hora_salida',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaHoraSalida: Date | undefined;

  /** Fecha en que se espera recuperar el comprobante (opcional en el cuaderno). */
  @Column({ name: 'fecha_devolucion_estimada', type: 'date', nullable: true })
  fechaDevolucionEstimada?: string | null;

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

  /**
   * Foto/imagen de la evidencia (cuaderno firmado) de la salida y de la devolución.
   * Se guarda en carpeta privada y se sirve solo con sesión; es una por lote.
   */
  @Column({
    name: 'evidencia_salida',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  evidenciaSalida?: string | null;

  @Column({
    name: 'evidencia_salida_mime',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  evidenciaSalidaMime?: string | null;

  @Column({
    name: 'evidencia_devolucion',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  evidenciaDevolucion?: string | null;

  @Column({
    name: 'evidencia_devolucion_mime',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  evidenciaDevolucionMime?: string | null;

  @Column({ type: 'text', nullable: true })
  observaciones?: string | null;

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

  /**
   * Quién trajo el comprobante de vuelta. Puede ser distinto del solicitante
   * (p. ej. el jefe pide a su auxiliar que lo devuelva).
   */
  @ManyToOne(() => Funcionario, { nullable: true })
  @JoinColumn({ name: 'devuelto_por_funcionario_id' })
  devueltoPorFuncionario?: Funcionario;

  @Column({
    name: 'devuelto_por_funcionario_id',
    type: 'integer',
    nullable: true,
  })
  devueltoPorFuncionarioId?: number | null;

  /** Cómo se verificó a quien devuelve (firma o huella). */
  @Column({
    name: 'metodo_verificacion_devolucion',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  metodoVerificacionDevolucion?: MetodoVerificacion | null;

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
