import { Test, TestingModule } from '@nestjs/testing';
import { PrestamosNotaService } from './prestamos-nota.service';

describe('PrestamosNotaService', () => {
  let service: PrestamosNotaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrestamosNotaService],
    }).compile();

    service = module.get<PrestamosNotaService>(PrestamosNotaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
