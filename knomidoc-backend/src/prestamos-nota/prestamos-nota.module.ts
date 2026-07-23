import { Module } from '@nestjs/common';
import { PrestamosNotaService } from './prestamos-nota.service';
import { PrestamosNotaController } from './prestamos-nota.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrestamosNota } from './entities/prestamos-nota.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PrestamosNota])],
  controllers: [PrestamosNotaController],
  providers: [PrestamosNotaService],
})
export class PrestamosNotaModule {}
