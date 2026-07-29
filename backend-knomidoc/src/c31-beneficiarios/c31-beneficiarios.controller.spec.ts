import { Test, TestingModule } from '@nestjs/testing';
import { C31BeneficiariosController } from './c31-beneficiarios.controller';
import { C31BeneficiariosService } from './c31-beneficiarios.service';

describe('C31BeneficiariosController', () => {
  let controller: C31BeneficiariosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [C31BeneficiariosController],
      providers: [C31BeneficiariosService],
    }).compile();

    controller = module.get<C31BeneficiariosController>(
      C31BeneficiariosController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
