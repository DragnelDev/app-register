import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotaAuditoria } from './entities/nota-auditoria.entity';
import { NotasAuditoriaController } from './notas-auditoria.controller';
import { NotasAuditoriaService } from './notas-auditoria.service';

@Module({
  imports: [TypeOrmModule.forFeature([NotaAuditoria])],
  controllers: [NotasAuditoriaController],
  providers: [NotasAuditoriaService],
})
export class NotasAuditoriaModule {}
