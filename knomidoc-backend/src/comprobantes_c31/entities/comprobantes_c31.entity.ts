import { C31Beneficiario } from 'src/c31-beneficiarios/entities/c31-beneficiario.entity';
import { C31CarpetasUbicacion } from 'src/c31-carpetas-ubicacion/entities/c31-carpetas-ubicacion.entity';
import { C31Devengado } from 'src/c31-devengados/entities/c31-devengado.entity';
import { C31Preventivo } from 'src/c31-preventivos/entities/c31-preventivo.entity';
import { C31Cheque } from 'src/c31-cheques/entities/c31-cheque.entity';
import { BaseAuditoriaEntity } from 'src/common/entities/base-auditoria.entity';
import { NotasEntrega } from 'src/notas-entrega/entities/notas-entrega.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum EstadoAprobacionC31 {
  PENDIENTE = 'PENDIENTE',
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
}

export enum EstadoFisicoC31 {
  EN_ARCHIVO = 'EN_ARCHIVO',
  PRESTADO = 'PRESTADO',
}

@Entity('comprobantes_c31')
export class ComprobantesC31 extends BaseAuditoriaEntity {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @ManyToOne(() => NotasEntrega, (nota) => nota.comprobantesC31, {
    nullable: true,
  })
  @JoinColumn({ name: 'nota_entrega_id' })
  notaEntrega?: NotasEntrega;

  @Column({ name: 'nota_entrega_id', type: 'integer', nullable: true })
  notaEntregaId?: number;

  @Column({ name: 'monto_total', type: 'decimal', precision: 14, scale: 2 })
  montoTotal: number | undefined;

  @Column({ name: 'fecha_elaboracion', type: 'date' })
  fechaElaboracion: Date | undefined;

  @Column({ type: 'text' })
  descripcion: string | undefined;

  @Column({ name: 'numero_folio', type: 'int', nullable: true })
  numeroFolio?: number;

  @Column({ name: 'esta_foliado', type: 'boolean', default: false })
  estaFoliado: boolean | undefined;

  @Column({ name: 'cantidad_carpetas', type: 'int', default: 1 })
  cantidadCarpetas: number | undefined;

  @Column({
    name: 'estado_aprobacion',
    type: 'varchar',
    length: 20,
    default: EstadoAprobacionC31.PENDIENTE,
  })
  estadoAprobacion: EstadoAprobacionC31 | undefined;

  @Column({
    name: 'estado_fisico',
    type: 'varchar',
    length: 20,
    default: EstadoFisicoC31.EN_ARCHIVO,
  })
  estadoFisico: EstadoFisicoC31 | undefined;

  // Relaciones 1:N
  @OneToMany(() => C31Preventivo, (prev) => prev.comprobante, { cascade: true })
  preventivos: C31Preventivo[] | undefined;

  @OneToMany(() => C31Devengado, (dev) => dev.comprobante, { cascade: true })
  devengados: C31Devengado[] | undefined;

  @OneToMany(() => C31Beneficiario, (ben) => ben.comprobante, { cascade: true })
  beneficiarios: C31Beneficiario[] | undefined;

  @OneToMany(() => C31Cheque, (chq) => chq.comprobante, { cascade: true })
  cheques: C31Cheque[] | undefined;

  @OneToMany(() => C31CarpetasUbicacion, (ubic) => ubic.comprobante, {
    cascade: true,
  })
  carpetasUbicacion: C31CarpetasUbicacion[] | undefined;
}
