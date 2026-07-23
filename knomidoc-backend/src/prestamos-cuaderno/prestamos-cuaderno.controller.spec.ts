import { Test, TestingModule } from '@nestjs/testing';
import { PrestamosCuadernoController } from './prestamos-cuaderno.controller';
import { PrestamosCuadernoService } from './prestamos-cuaderno.service';

describe('PrestamosCuadernoController', () => {
  let controller: PrestamosCuadernoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrestamosCuadernoController],
      providers: [PrestamosCuadernoService],
    }).compile();

    controller = module.get<PrestamosCuadernoController>(
      PrestamosCuadernoController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
