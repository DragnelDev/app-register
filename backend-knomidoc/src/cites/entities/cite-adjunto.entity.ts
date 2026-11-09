import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cite } from './cite.entity';

/** Respaldo escaneado (PDF o imagen) de un CITE; puede haber varios. */
@Entity('cite_adjuntos')
export class CiteAdjunto {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @ManyToOne(() => Cite, (c) => c.adjuntos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cite_id' })
  cite?: Cite;

  @Column({ name: 'cite_id', type: 'integer' })
  citeId: number | undefined;

  @Column({ name: 'nombre_original', type: 'varchar', length: 255 })
  nombreOriginal: string | undefined;

  /** Ruta relativa en la carpeta privada (gestión/OF-004/…parte-1-de-2.pdf). */
  @Column({ name: 'nombre_archivo', type: 'varchar', length: 200 })
  nombreArchivo: string | undefined;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string | undefined;

  @Column({ type: 'integer' })
  tamano: number | undefined;

  @Column({ name: 'subido_por_id', type: 'integer', nullable: true })
  subidoPorId?: number | null;

  @CreateDateColumn({ name: 'fecha_carga' })
  fechaCarga: Date | undefined;
}
