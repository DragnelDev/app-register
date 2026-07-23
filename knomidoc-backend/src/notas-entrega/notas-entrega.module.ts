import { Module } from '@nestjs/common';
import { NotasEntregaService } from './notas-entrega.service';
import { NotasEntregaController } from './notas-entrega.controller';
import { NotasEntrega } from './entities/notas-entrega.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([NotasEntrega])],
  controllers: [NotasEntregaController],
  providers: [NotasEntregaService],
  exports: [NotasEntregaService],
})
export class NotasEntregaModule {}
