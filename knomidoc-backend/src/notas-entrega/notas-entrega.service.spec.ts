import { Test, TestingModule } from '@nestjs/testing';
import { NotasEntregaService } from './notas-entrega.service';

describe('NotasEntregaService', () => {
  let service: NotasEntregaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotasEntregaService],
    }).compile();

    service = module.get<NotasEntregaService>(NotasEntregaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
