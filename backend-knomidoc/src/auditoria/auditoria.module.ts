import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaLog } from './entities/auditoria-log.entity';
import { AuditoriaService } from './auditoria.service';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaInterceptor } from './auditoria.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([AuditoriaLog])],
  controllers: [AuditoriaController],
  providers: [
    AuditoriaService,
    // Registra automáticamente toda operación que modifica datos
    { provide: APP_INTERCEPTOR, useClass: AuditoriaInterceptor },
  ],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
