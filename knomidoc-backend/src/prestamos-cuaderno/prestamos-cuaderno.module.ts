import { Module } from '@nestjs/common';
import { PrestamosCuadernoService } from './prestamos-cuaderno.service';
import { PrestamosCuadernoController } from './prestamos-cuaderno.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrestamosCuaderno } from './entities/prestamos-cuaderno.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PrestamosCuaderno])],
  controllers: [PrestamosCuadernoController],
  providers: [PrestamosCuadernoService],
})
export class PrestamosCuadernoModule {}
