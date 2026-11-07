import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Remision, RemisionItem } from './entities/remision.entity';
import { RemisionesController } from './remisiones.controller';
import { RemisionesService } from './remisiones.service';

@Module({
  imports: [TypeOrmModule.forFeature([Remision, RemisionItem])],
  controllers: [RemisionesController],
  providers: [RemisionesService],
})
export class RemisionesModule {}
