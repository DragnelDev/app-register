import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseAuditoriaEntity } from '../../common/entities/base-auditoria.entity';

export interface SeccionNotaAuditoria {
  titulo: string;
  texto: string;
  /** N° de preventivo (o rango) tal como se quiere mostrar: "501-720", "2-654" */
  items: string[];
}

export interface HistorialNotaAuditoria {
  fecha: string;
  usuarioId?: number | null;
  usuario?: string | null;
  motivo: string;
  campos: string[];
}

export interface PersonaNota {
  nombre: string;
  cargo: string;
}

/**
 * Nota de respuesta a Auditoría Interna: CITE, destinatario, vía, remitente,
 * referencia, texto introductorio, secciones con cuadros de comprobantes y cierre.
 * Todo el contenido es editable mientras la nota sea borrador.
 */
@Entity('notas_auditoria')
export class NotaAuditoria extends BaseAuditoriaEntity {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @Column({ type: 'varchar', length: 80, unique: true })
  cite: string | undefined;

  @Column({ type: 'date' })
  fecha: string | undefined;

  @Column({ type: 'jsonb' })
  destinatario: PersonaNota | undefined;

  @Column({ type: 'jsonb', nullable: true })
  via?: PersonaNota | null;

  @Column({ type: 'jsonb' })
  remitente: PersonaNota | undefined;

  @Column({ type: 'text' })
  referencia: string | undefined;

  @Column({ type: 'text', default: '' })
  introduccion: string | undefined;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  secciones: SeccionNotaAuditoria[] | undefined;

  @Column({ type: 'text', default: '' })
  cierre: string | undefined;

  @Column({ type: 'integer', nullable: true })
  gestion?: number | null;

  /** BORRADOR: libre. EMITIDA: ya se imprimió/firmó; solo se cambia con motivo. */
  @Column({ type: 'varchar', length: 12, default: 'BORRADOR' })
  estado: 'BORRADOR' | 'EMITIDA' | undefined;

  @Column({ name: 'fecha_emision', type: 'timestamp', nullable: true })
  fechaEmision?: Date | null;

  /** Cambios hechos después de emitirla: quién, cuándo y por qué. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  historial: HistorialNotaAuditoria[] | undefined;

  /** N° de las notas de préstamo (préstamos por nota) con las que se vinculó. */
  @Column({ name: 'notas_prestamo', type: 'jsonb', default: () => "'[]'" })
  notasPrestamo: string[] | undefined;
}
