import { Module } from '@nestjs/common';
import { ComprobantesC31Service } from './comprobantes_c31.service';
import { ComprobantesC31Controller } from './comprobantes_c31.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComprobantesC31 } from './entities/comprobantes_c31.entity';
import { Carpeta } from 'src/carpetas/entities/carpeta.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ComprobantesC31, Carpeta])],
  controllers: [ComprobantesC31Controller],
  providers: [ComprobantesC31Service],
})
export class ComprobantesC31Module {}
