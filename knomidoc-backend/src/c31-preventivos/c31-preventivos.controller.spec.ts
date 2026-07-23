import { Test, TestingModule } from '@nestjs/testing';
import { C31PreventivosController } from './c31-preventivos.controller';
import { C31PreventivosService } from './c31-preventivos.service';

describe('C31PreventivosController', () => {
  let controller: C31PreventivosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [C31PreventivosController],
      providers: [C31PreventivosService],
    }).compile();

    controller = module.get<C31PreventivosController>(C31PreventivosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
