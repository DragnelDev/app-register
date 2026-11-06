import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ComprobantesC31 } from '../../comprobantes_c31/entities/comprobantes_c31.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum TipoAdjuntoC31 {
  /** Escaneo del comprobante C31 (alimenta el indicador "digitalizado"). */
  C31 = 'C31',
  /** Documentos de respaldo del gasto. */
  RESPALDO = 'RESPALDO',
}

export const TIPOS_ADJUNTO_C31 = Object.values(TipoAdjuntoC31);

/** Archivo digitalizado (PDF o imagen) de un comprobante C31. */
@Entity('c31_adjuntos')
export class C31Adjunto {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @ManyToOne(() => ComprobantesC31, (c) => c.adjuntos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'comprobante_id' })
  comprobante?: ComprobantesC31;

  @Column({ name: 'comprobante_id', type: 'integer' })
  comprobanteId: number | undefined;

  @Column({ type: 'varchar', length: 12, default: TipoAdjuntoC31.C31 })
  tipo: TipoAdjuntoC31 | undefined;

  /** Nombre con el que se subió el archivo (se muestra al descargar). */
  @Column({ name: 'nombre_original', type: 'varchar', length: 255 })
  nombreOriginal: string | undefined;

  /** Nombre generado en disco (nunca el del cliente). */
  @Column({ name: 'nombre_archivo', type: 'varchar', length: 100 })
  nombreArchivo: string | undefined;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string | undefined;

  @Column({ type: 'integer' })
  tamano: number | undefined;

  @CreateDateColumn({ name: 'fecha_carga' })
  fechaCarga: Date | undefined;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'subido_por_id' })
  subidoPor?: Usuario;

  @Column({ name: 'subido_por_id', type: 'integer', nullable: true })
  subidoPorId?: number | null;
}
