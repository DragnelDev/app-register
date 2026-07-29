import { Module } from '@nestjs/common';
import { C31PreventivosService } from './c31-preventivos.service';
import { C31PreventivosController } from './c31-preventivos.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { C31Preventivo } from './entities/c31-preventivo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([C31Preventivo])],
  controllers: [C31PreventivosController],
  providers: [C31PreventivosService],
})
export class C31PreventivosModule {}
