import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseAuditoriaEntity } from '../../common/entities/base-auditoria.entity';

export enum EstadoGestion {
  ABIERTA = 'ABIERTA',
  CERRADA = 'CERRADA',
}

/**
 * Parámetros por gestión (año fiscal). Solo una gestión puede estar marcada
 * como "activa": es la que se propone por defecto al registrar comprobantes.
 */
@Entity('parametros_gestion')
export class ParametroGestion extends BaseAuditoriaEntity {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @Column({ type: 'int', unique: true })
  gestion: number | undefined;

  @Column({
    type: 'varchar',
    length: 10,
    default: EstadoGestion.ABIERTA,
  })
  estado: EstadoGestion | undefined;

  @Column({ type: 'boolean', default: false })
  activa: boolean | undefined;

  @Column({ name: 'fecha_apertura', type: 'date', nullable: true })
  fechaApertura?: string | null;

  @Column({ name: 'fecha_cierre', type: 'date', nullable: true })
  fechaCierre?: string | null;

  @Column({ type: 'text', nullable: true })
  observaciones?: string | null;
}
