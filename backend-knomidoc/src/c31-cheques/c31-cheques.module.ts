import { Module } from '@nestjs/common';
import { C31ChequesService } from './c31-cheques.service';
import { C31ChequesController } from './c31-cheques.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { C31Cheque } from './entities/c31-cheque.entity';

@Module({
  imports: [TypeOrmModule.forFeature([C31Cheque])],
  controllers: [C31ChequesController],
  providers: [C31ChequesService],
})
export class C31ChequesModule {}
