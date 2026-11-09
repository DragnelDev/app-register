import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseAuditoriaEntity } from '../../common/entities/base-auditoria.entity';

/**
 * Solicitud de documentación que llega de la Unidad de Auditoría Interna (no tiene
 * usuario en el sistema: la registra Archivo). Guarda el CITE recibido y los
 * comprobantes pedidos; de aquí se arma la respuesta (nota a Auditoría).
 */
@Entity('solicitudes_auditoria')
export class SolicitudAuditoria extends BaseAuditoriaEntity {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  /** CITE de la nota recibida de Auditoría. */
  @Column({ type: 'varchar', length: 120 })
  cite: string | undefined;

  @Column({ type: 'date' })
  fecha: string | undefined;

  @Column({ type: 'varchar', length: 150, default: '' })
  solicitante: string | undefined;

  @Column({
    name: 'cargo_solicitante',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  cargoSolicitante?: string | null;

  @Column({ type: 'text', default: '' })
  asunto: string | undefined;

  /** N° pedidos tal como se pegaron o marcaron: "1-120, 130, DEV 45". */
  @Column({ type: 'text', default: '' })
  texto: string | undefined;

  @Column({ type: 'integer' })
  gestion: number | undefined;

  @Column({ type: 'varchar', length: 12, default: 'PENDIENTE' })
  estado: 'PENDIENTE' | 'RESPONDIDA' | undefined;

  /** Nota a Auditoría con la que se respondió. */
  @Column({ name: 'nota_auditoria_id', type: 'integer', nullable: true })
  notaAuditoriaId?: number | null;

  @Column({ type: 'text', nullable: true })
  observaciones?: string | null;

  /** Registro de ejemplo creado para simular el flujo. */
  @Column({ type: 'boolean', default: false })
  ejemplo: boolean | undefined;
}
