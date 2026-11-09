import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseAuditoriaEntity } from '../../common/entities/base-auditoria.entity';
import { CiteAdjunto } from './cite-adjunto.entity';

export const DIRECCIONES_CITE = ['EMITIDO', 'RECIBIDO'] as const;
export type DireccionCite = (typeof DIRECCIONES_CITE)[number];

/**
 * Series documentales de la Unidad de Archivos. Cada serie tiene su propia numeración
 * por gestión (001, 002...): GAMSL/ARCH/<SERIE>/OF-N° 001/2026.
 */
export const TIPOS_CITE = ['PS', 'AUD', 'CERT', 'INF', 'EXT', 'OF'] as const;
export type TipoCite = (typeof TIPOS_CITE)[number];

/**
 * Libro global de CITEs de la Unidad de Archivos: los que emite (con correlativo
 * automático por tipo y gestión) y los que recibe, cada uno con su respaldo escaneado.
 */
@Entity('cites')
@Index(['direccion', 'cite'], { unique: true })
export class Cite extends BaseAuditoriaEntity {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @Column({ type: 'varchar', length: 10 })
  direccion: DireccionCite | undefined;

  @Column({ type: 'varchar', length: 10, default: 'OF' })
  tipo: TipoCite | undefined;

  /** N° correlativo (solo en los emitidos con numeración automática). */
  @Column({ type: 'integer', nullable: true })
  correlativo?: number | null;

  @Column({ type: 'varchar', length: 120 })
  cite: string | undefined;

  @Column({ type: 'integer' })
  gestion: number | undefined;

  @Column({ type: 'date' })
  fecha: string | undefined;

  /** Destinatario (emitidos) o remitente (recibidos). */
  @Column({ type: 'varchar', length: 200, default: '' })
  contraparte: string | undefined;

  @Column({
    name: 'cargo_contraparte',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  cargoContraparte?: string | null;

  @Column({ type: 'text', default: '' })
  asunto: string | undefined;

  /** CITE al que responde o con el que se relaciona. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  referencia?: string | null;

  @Column({ type: 'text', nullable: true })
  observaciones?: string | null;

  @Column({ type: 'varchar', length: 12, default: 'REGISTRADO' })
  estado: 'REGISTRADO' | 'ANULADO' | undefined;

  @Column({ name: 'motivo_anulacion', type: 'text', nullable: true })
  motivoAnulacion?: string | null;

  /** MANUAL, NOTA_AUDITORIA, SOLICITUD_AUDITORIA… cuando lo generó otro módulo. */
  @Column({ type: 'varchar', length: 30, default: 'MANUAL' })
  origen: string | undefined;

  @Column({ name: 'origen_id', type: 'integer', nullable: true })
  origenId?: number | null;

  @OneToMany(() => CiteAdjunto, (a) => a.cite)
  adjuntos?: CiteAdjunto[];
}
