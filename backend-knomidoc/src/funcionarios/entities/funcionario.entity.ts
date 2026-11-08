import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { BaseFechasEntity } from '../../common/entities/base-fechas.entity';

export enum EstadoFuncionario {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
}

export const ESTADOS_FUNCIONARIO = Object.values(EstadoFuncionario);

/**
 * Directorio interno de funcionarios que solicitan préstamos o reciben
 * documentación. NO es un usuario del sistema (no tiene login): es solo un
 * registro administrativo.
 */
@Entity('funcionarios')
export class Funcionario extends BaseFechasEntity {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @Index({ unique: true, where: '"fecha_eliminacion" IS NULL' })
  @Column({ type: 'varchar', length: 20 })
  ci: string | undefined;

  @Column({ type: 'varchar', length: 100 })
  nombres: string | undefined;

  @Column({ type: 'varchar', length: 100 })
  apellidos: string | undefined;

  @Column({ type: 'varchar', length: 150 })
  cargo: string | undefined;

  /** Unidad u oficina (Obras Públicas, Auditoría Interna, etc.). */
  @Column({ name: 'unidad_oficina', type: 'varchar', length: 150 })
  unidadOficina: string | undefined;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefono?: string | null;

  @Column({
    type: 'varchar',
    length: 10,
    default: EstadoFuncionario.ACTIVO,
  })
  estado: EstadoFuncionario | undefined;

  /**
   * Plantilla de huella enrolada. Hoy la genera el lector DEMO del frontend; con un
   * lector real (SDK) aquí se guarda la plantilla que entregue el dispositivo.
   * No se devuelve en las consultas (select: false).
   */
  @Column({
    name: 'huella_plantilla',
    type: 'text',
    nullable: true,
    select: false,
  })
  huellaPlantilla?: string | null;

  @Column({
    name: 'huella_registrada_en',
    type: 'timestamp',
    nullable: true,
  })
  huellaRegistradaEn?: Date | null;

  /** 'DEMO' o el identificador del lector real que la capturó. */
  @Column({
    name: 'huella_lector',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  huellaLector?: string | null;
}
