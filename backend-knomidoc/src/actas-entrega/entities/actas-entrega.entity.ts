import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ComprobantesC31 } from '../../comprobantes_c31/entities/comprobantes_c31.entity';

/** Acta de entrega de comprobantes desde Tesorería (lote de ingreso). */
@Entity('actas_entrega')
export class ActasEntrega {
  @PrimaryGeneratedColumn('identity')
  id?: number;

  @Column('varchar', { length: 50, name: 'numero_acta', unique: true })
  numeroActa?: string;

  @Column('varchar', {
    length: 100,
    name: 'unidad_emisora',
    default: 'Tesorería',
  })
  unidadEmisora?: string;

  @Column('varchar', { length: 150, name: 'responsable_entrega' })
  responsableEntrega?: string;

  @Column('varchar', { length: 150, name: 'responsable_recepcion' })
  responsableRecepcion?: string;

  /** Se mantiene sincronizada con los comprobantes vinculados al acta. */
  @Column('int', { name: 'cantidad_comprobantes', default: 0 })
  cantidadComprobantes?: number;

  @Column('date', { name: 'fecha_recepcion' })
  fechaRecepcion?: string;

  @Column('text', { nullable: true })
  observaciones?: string;

  /** Relación "agrupa (lote de ingreso)": 1 acta ── N comprobantes C31. */
  @OneToMany(() => ComprobantesC31, (c31) => c31.actaEntrega)
  comprobantesC31?: ComprobantesC31[];
}
