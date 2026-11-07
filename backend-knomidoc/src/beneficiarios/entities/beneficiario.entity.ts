import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseAuditoriaEntity } from '../../common/entities/base-auditoria.entity';

export const TIPOS_PERSONA = ['NATURAL', 'JURIDICA'] as const;
export type TipoPersona = (typeof TIPOS_PERSONA)[number];

export const TIPOS_DOCUMENTO = ['CI', 'NIT', 'OTRO', 'SIN_DOCUMENTO'] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const ESTADOS_BENEFICIARIO = ['ACTIVO', 'INACTIVO'] as const;
export type EstadoBeneficiario = (typeof ESTADOS_BENEFICIARIO)[number];

/**
 * Directorio de beneficiarios (personas o empresas a quienes se paga). Los C31 y
 * los pagos se vinculan a este catálogo; cada C31 conserva además el nombre tal
 * como se registró.
 */
@Entity('beneficiarios')
export class Beneficiario extends BaseAuditoriaEntity {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @Column({
    name: 'tipo_persona',
    type: 'varchar',
    length: 10,
    default: 'NATURAL',
  })
  tipoPersona: TipoPersona | undefined;

  /** Nombre completo o razón social, en mayúsculas como figura en el SIGEP. */
  @Column({ type: 'varchar', length: 200 })
  nombre: string | undefined;

  @Column({
    name: 'tipo_documento',
    type: 'varchar',
    length: 15,
    default: 'SIN_DOCUMENTO',
  })
  tipoDocumento: TipoDocumento | undefined;

  /** CI o NIT. Único por tipo cuando se informa. */
  @Column({
    name: 'numero_documento',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  numeroDocumento?: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefono?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  direccion?: string | null;

  @Column({ type: 'varchar', length: 10, default: 'ACTIVO' })
  estado: EstadoBeneficiario | undefined;
}
