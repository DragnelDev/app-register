import { Module } from '@nestjs/common';
import { C31DevengadosService } from './c31-devengados.service';
import { C31DevengadosController } from './c31-devengados.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { C31Devengado } from './entities/c31-devengado.entity';

@Module({
  imports: [TypeOrmModule.forFeature([C31Devengado])],
  controllers: [C31DevengadosController],
  providers: [C31DevengadosService],
})
export class C31DevengadosModule {}
