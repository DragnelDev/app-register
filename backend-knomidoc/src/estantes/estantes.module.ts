import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Estante } from './entities/estante.entity';
import { Deposito } from '../depositos/entities/deposito.entity';
import { Carpeta } from '../carpetas/entities/carpeta.entity';
import { EstantesService } from './estantes.service';
import { EstantesController } from './estantes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Estante, Deposito, Carpeta])],
  controllers: [EstantesController],
  providers: [EstantesService],
  exports: [TypeOrmModule, EstantesService],
})
export class EstantesModule {}
