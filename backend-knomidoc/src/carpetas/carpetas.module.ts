import { Module } from '@nestjs/common';
import { CarpetasService } from './carpetas.service';
import { CarpetasController } from './carpetas.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Carpeta } from './entities/carpeta.entity';
import { EstantesModule } from 'src/estantes/estantes.module';

@Module({
  imports: [TypeOrmModule.forFeature([Carpeta]), EstantesModule],
  controllers: [CarpetasController],
  providers: [CarpetasService],
})
export class CarpetasModule {}
