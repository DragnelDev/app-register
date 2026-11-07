import { Module } from '@nestjs/common';
import { ComprobantesC31Service } from './comprobantes_c31.service';
import { ComprobantesC31Controller } from './comprobantes_c31.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComprobantesC31 } from './entities/comprobantes_c31.entity';
import { Carpeta } from 'src/carpetas/entities/carpeta.entity';
import { C31Historial } from '../c31-historial/entities/c31-historial.entity';
import { PrestamosNota } from '../prestamos-nota/entities/prestamos-nota.entity';
import { PrestamosCuaderno } from '../prestamos-cuaderno/entities/prestamos-cuaderno.entity';
import { BeneficiariosModule } from '../beneficiarios/beneficiarios.module';
import { C31SeguimientoService } from './c31-seguimiento.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ComprobantesC31,
      Carpeta,
      C31Historial,
      PrestamosNota,
      PrestamosCuaderno,
    ]),
    BeneficiariosModule,
  ],
  controllers: [ComprobantesC31Controller],
  providers: [ComprobantesC31Service, C31SeguimientoService],
})
export class ComprobantesC31Module {}
