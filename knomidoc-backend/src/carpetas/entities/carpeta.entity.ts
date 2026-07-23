import { C31CarpetasUbicacion } from 'src/c31-carpetas-ubicacion/entities/c31-carpetas-ubicacion.entity';
import { BaseAuditoriaEntity } from 'src/common/entities/base-auditoria.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('carpetas')
export class Carpeta extends BaseAuditoriaEntity {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @Column({ name: 'codigo_carpeta', type: 'varchar', length: 50, unique: true })
  codigoCarpeta: string | undefined;

  @Column({ name: 'ubicacion_fisica', type: 'varchar', length: 150 })
  ubicacionFisica: string | undefined;

  @Column({
    name: 'estado_fisico',
    type: 'varchar',
    length: 20,
    default: 'EN ARCHIVO',
  })
  estadoFisico?: string;

  @OneToMany(() => C31CarpetasUbicacion, (ubic) => ubic.carpeta)
  comprobantesUbicacion?: C31CarpetasUbicacion[];
}
