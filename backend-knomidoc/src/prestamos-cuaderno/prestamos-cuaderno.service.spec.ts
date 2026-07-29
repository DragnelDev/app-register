import { Test, TestingModule } from '@nestjs/testing';
import { PrestamosCuadernoService } from './prestamos-cuaderno.service';

describe('PrestamosCuadernoService', () => {
  let service: PrestamosCuadernoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrestamosCuadernoService],
    }).compile();

    service = module.get<PrestamosCuadernoService>(PrestamosCuadernoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
