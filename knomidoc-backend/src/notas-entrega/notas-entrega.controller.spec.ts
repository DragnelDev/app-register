import { Test, TestingModule } from '@nestjs/testing';
import { NotasEntregaController } from './notas-entrega.controller';
import { NotasEntregaService } from './notas-entrega.service';

describe('NotasEntregaController', () => {
  let controller: NotasEntregaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotasEntregaController],
      providers: [NotasEntregaService],
    }).compile();

    controller = module.get<NotasEntregaController>(NotasEntregaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
