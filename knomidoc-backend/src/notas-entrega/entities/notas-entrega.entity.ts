import { BaseAuditoriaEntity } from 'src/common/entities/base-auditoria.entity';
import { ComprobantesC31 } from 'src/comprobantes_c31/entities/comprobantes_c31.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('notas_entrega')
export class NotasEntrega extends BaseAuditoriaEntity {
  @PrimaryGeneratedColumn('identity')
  id: number | undefined;

  @Column('varchar', { length: 50, name: 'numero_nota' })
  numeroNota: string | undefined;

  @Column('varchar', { length: 100, name: 'oficina_origen' })
  oficinaOrigen: string | undefined;

  @Column('date', { name: 'fecha_entrega' })
  fechaEntrega: Date | undefined;

  @Column('varchar', { length: 500, name: 'imagen_url', nullable: true })
  imagenUrl: string | undefined;

  @OneToMany(() => ComprobantesC31, (c31) => c31.notaEntrega)
  comprobantesC31: ComprobantesC31[] | undefined;
}
