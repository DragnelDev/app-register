import { Test, TestingModule } from '@nestjs/testing';
import { C31DevengadosService } from './c31-devengados.service';

describe('C31DevengadosService', () => {
  let service: C31DevengadosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [C31DevengadosService],
    }).compile();

    service = module.get<C31DevengadosService>(C31DevengadosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
