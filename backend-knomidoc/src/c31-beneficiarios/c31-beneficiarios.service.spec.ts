import { Test, TestingModule } from '@nestjs/testing';
import { C31BeneficiariosService } from './c31-beneficiarios.service';

describe('C31BeneficiariosService', () => {
  let service: C31BeneficiariosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [C31BeneficiariosService],
    }).compile();

    service = module.get<C31BeneficiariosService>(C31BeneficiariosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
