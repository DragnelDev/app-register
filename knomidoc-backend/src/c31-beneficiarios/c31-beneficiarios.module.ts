import { Module } from '@nestjs/common';
import { C31BeneficiariosService } from './c31-beneficiarios.service';
import { C31BeneficiariosController } from './c31-beneficiarios.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { C31Beneficiario } from './entities/c31-beneficiario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([C31Beneficiario])],
  controllers: [C31BeneficiariosController],
  providers: [C31BeneficiariosService],
})
export class C31BeneficiariosModule {}
