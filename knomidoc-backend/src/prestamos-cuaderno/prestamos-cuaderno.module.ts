import { Module } from '@nestjs/common';
import { PrestamosCuadernoService } from './prestamos-cuaderno.service';
import { PrestamosCuadernoController } from './prestamos-cuaderno.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrestamosCuaderno } from './entities/prestamos-cuaderno.entity';
import { ComprobantesC31 } from '../comprobantes_c31/entities/comprobantes_c31.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PrestamosCuaderno, ComprobantesC31])],
  controllers: [PrestamosCuadernoController],
  providers: [PrestamosCuadernoService],
})
export class PrestamosCuadernoModule {}
