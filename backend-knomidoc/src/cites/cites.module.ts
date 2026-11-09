import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cite } from './entities/cite.entity';
import { CiteAdjunto } from './entities/cite-adjunto.entity';
import { CitesController } from './cites.controller';
import { CitesService } from './cites.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cite, CiteAdjunto])],
  controllers: [CitesController],
  providers: [CitesService],
  exports: [CitesService],
})
export class CitesModule {}
