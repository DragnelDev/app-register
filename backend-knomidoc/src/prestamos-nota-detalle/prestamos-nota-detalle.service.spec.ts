import { Test, TestingModule } from '@nestjs/testing';
import { PrestamosNotaDetalleService } from './prestamos-nota-detalle.service';

describe('PrestamosNotaDetalleService', () => {
  let service: PrestamosNotaDetalleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrestamosNotaDetalleService],
    }).compile();

    service = module.get<PrestamosNotaDetalleService>(
      PrestamosNotaDetalleService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
