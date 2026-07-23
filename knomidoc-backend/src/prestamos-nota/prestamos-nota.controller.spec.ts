import { Test, TestingModule } from '@nestjs/testing';
import { PrestamosNotaController } from './prestamos-nota.controller';
import { PrestamosNotaService } from './prestamos-nota.service';

describe('PrestamosNotaController', () => {
  let controller: PrestamosNotaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrestamosNotaController],
      providers: [PrestamosNotaService],
    }).compile();

    controller = module.get<PrestamosNotaController>(PrestamosNotaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
