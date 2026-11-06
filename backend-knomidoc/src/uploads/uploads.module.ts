import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadsController } from './uploads.controller';
import { C31AdjuntosController } from './c31-adjuntos.controller';
import { C31AdjuntosService } from './c31-adjuntos.service';
import { C31Adjunto } from './entities/c31-adjunto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([C31Adjunto])],
  controllers: [UploadsController, C31AdjuntosController],
  providers: [C31AdjuntosService],
})
export class UploadsModule {}
