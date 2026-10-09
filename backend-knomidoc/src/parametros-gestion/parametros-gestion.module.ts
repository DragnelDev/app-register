import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParametroGestion } from './entities/parametro-gestion.entity';
import { ParametrosGestionService } from './parametros-gestion.service';
import { ParametrosGestionController } from './parametros-gestion.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ParametroGestion])],
  controllers: [ParametrosGestionController],
  providers: [ParametrosGestionService],
  exports: [ParametrosGestionService],
})
export class ParametrosGestionModule {}
