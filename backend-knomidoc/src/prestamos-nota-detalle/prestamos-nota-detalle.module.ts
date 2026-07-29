import { Module } from '@nestjs/common';
import { PrestamosNotaDetalleService } from './prestamos-nota-detalle.service';
import { PrestamosNotaDetalleController } from './prestamos-nota-detalle.controller';
import { PrestamosNotaDetalle } from './entities/prestamos-nota-detalle.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([PrestamosNotaDetalle])],
  controllers: [PrestamosNotaDetalleController],
  providers: [PrestamosNotaDetalleService],
})
export class PrestamosNotaDetalleModule {}
