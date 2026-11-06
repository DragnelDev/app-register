import { Module } from '@nestjs/common';
import { PrestamosNotaService } from './prestamos-nota.service';
import { PrestamosNotaController } from './prestamos-nota.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrestamosNota } from './entities/prestamos-nota.entity';
import { Funcionario } from '../funcionarios/entities/funcionario.entity';
import { ComprobantesC31 } from '../comprobantes_c31/entities/comprobantes_c31.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PrestamosNota, ComprobantesC31, Funcionario]),
  ],
  controllers: [PrestamosNotaController],
  providers: [PrestamosNotaService],
})
export class PrestamosNotaModule {}
