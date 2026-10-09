import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deposito } from './entities/deposito.entity';
import { Estante } from '../estantes/entities/estante.entity';
import { DepositosService } from './depositos.service';
import { DepositosController } from './depositos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Deposito, Estante])],
  controllers: [DepositosController],
  providers: [DepositosService],
  exports: [DepositosService],
})
export class DepositosModule {}
