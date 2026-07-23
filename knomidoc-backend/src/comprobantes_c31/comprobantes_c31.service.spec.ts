import { Test, TestingModule } from '@nestjs/testing';
import { ComprobantesC31Service } from './comprobantes_c31.service';

describe('ComprobantesC31Service', () => {
  let service: ComprobantesC31Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComprobantesC31Service],
    }).compile();

    service = module.get<ComprobantesC31Service>(ComprobantesC31Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
