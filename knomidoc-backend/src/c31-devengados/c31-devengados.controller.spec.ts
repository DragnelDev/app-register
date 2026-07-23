import { Test, TestingModule } from '@nestjs/testing';
import { C31DevengadosController } from './c31-devengados.controller';
import { C31DevengadosService } from './c31-devengados.service';

describe('C31DevengadosController', () => {
  let controller: C31DevengadosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [C31DevengadosController],
      providers: [C31DevengadosService],
    }).compile();

    controller = module.get<C31DevengadosController>(C31DevengadosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
