import { Module } from '@nestjs/common';
import { C31PreventivosService } from './c31-preventivos.service';
import { C31PreventivosController } from './c31-preventivos.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { C31Beneficiario } from 'src/c31-beneficiarios/entities/c31-beneficiario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([C31Beneficiario])],
  controllers: [C31PreventivosController],
  providers: [C31PreventivosService],
})
export class C31PreventivosModule {}
