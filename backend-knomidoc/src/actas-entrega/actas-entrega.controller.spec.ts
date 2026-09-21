import { Test, TestingModule } from '@nestjs/testing';
import { ActasEntregaController } from './actas-entrega.controller';
import { ActasEntregaService } from './actas-entrega.service';

describe('ActasEntregaController', () => {
  let controller: ActasEntregaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActasEntregaController],
      providers: [ActasEntregaService],
    }).compile();

    controller = module.get<ActasEntregaController>(ActasEntregaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
