import { Module } from '@nestjs/common';
import { C31CarpetasUbicacionService } from './c31-carpetas-ubicacion.service';
import { C31CarpetasUbicacionController } from './c31-carpetas-ubicacion.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { C31CarpetasUbicacion } from './entities/c31-carpetas-ubicacion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([C31CarpetasUbicacion])],
  controllers: [C31CarpetasUbicacionController],
  providers: [C31CarpetasUbicacionService],
})
export class C31CarpetasUbicacionModule {}
