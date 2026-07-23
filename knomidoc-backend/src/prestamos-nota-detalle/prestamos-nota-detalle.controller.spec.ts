import { Test, TestingModule } from '@nestjs/testing';
import { PrestamosNotaDetalleController } from './prestamos-nota-detalle.controller';
import { PrestamosNotaDetalleService } from './prestamos-nota-detalle.service';

describe('PrestamosNotaDetalleController', () => {
  let controller: PrestamosNotaDetalleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrestamosNotaDetalleController],
      providers: [PrestamosNotaDetalleService],
    }).compile();

    controller = module.get<PrestamosNotaDetalleController>(
      PrestamosNotaDetalleController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
