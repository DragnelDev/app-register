import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { C31Pago } from './entities/c31-pago.entity';
import { C31PagosController } from './c31-pagos.controller';
import { C31PagosService } from './c31-pagos.service';

@Module({
  imports: [TypeOrmModule.forFeature([C31Pago])],
  controllers: [C31PagosController],
  providers: [C31PagosService],
  exports: [C31PagosService],
})
export class C31PagosModule {}
