import { Module } from '@nestjs/common';
import { ActasEntregaController } from './actas-entrega.controller';
import { ActasEntrega } from './entities/actas-entrega.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActasEntregaService } from './actas-entrega.service';

@Module({
  imports: [TypeOrmModule.forFeature([ActasEntrega])],
  controllers: [ActasEntregaController],
  providers: [ActasEntregaService],
  exports: [ActasEntregaService],
})
export class ActasEntregaModule {}
