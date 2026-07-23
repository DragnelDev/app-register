import { Test, TestingModule } from '@nestjs/testing';
import { C31ChequesController } from './c31-cheques.controller';
import { C31ChequesService } from './c31-cheques.service';

describe('C31ChequesController', () => {
  let controller: C31ChequesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [C31ChequesController],
      providers: [C31ChequesService],
    }).compile();

    controller = module.get<C31ChequesController>(C31ChequesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
