import { Module } from '@nestjs/common';
import { PrestamosNotaService } from './prestamos-nota.service';
import { PrestamosNotaController } from './prestamos-nota.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrestamosNota } from './entities/prestamos-nota.entity';
import { PrestamosNotaDetalle } from '../prestamos-nota-detalle/entities/prestamos-nota-detalle.entity';
import { ComprobantesC31 } from '../comprobantes_c31/entities/comprobantes_c31.entity';
import { Carpeta } from '../carpetas/entities/carpeta.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PrestamosNota,
      PrestamosNotaDetalle,
      ComprobantesC31,
      Carpeta,
    ]),
  ],
  controllers: [PrestamosNotaController],
  providers: [PrestamosNotaService],
})
export class PrestamosNotaModule {}
