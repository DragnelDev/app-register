import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotaAuditoria } from './entities/nota-auditoria.entity';
import { SolicitudAuditoria } from './entities/solicitud-auditoria.entity';
import { CitesModule } from '../cites/cites.module';
import { PrestamosNota } from '../prestamos-nota/entities/prestamos-nota.entity';
import { NotasAuditoriaController } from './notas-auditoria.controller';
import { NotasAuditoriaService } from './notas-auditoria.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotaAuditoria,
      SolicitudAuditoria,
      PrestamosNota,
    ]),
    CitesModule,
  ],
  controllers: [NotasAuditoriaController],
  providers: [NotasAuditoriaService],
})
export class NotasAuditoriaModule {}
