import { Test, TestingModule } from '@nestjs/testing';
import { C31CarpetasUbicacionController } from './c31-carpetas-ubicacion.controller';
import { C31CarpetasUbicacionService } from './c31-carpetas-ubicacion.service';

describe('C31CarpetasUbicacionController', () => {
  let controller: C31CarpetasUbicacionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [C31CarpetasUbicacionController],
      providers: [C31CarpetasUbicacionService],
    }).compile();

    controller = module.get<C31CarpetasUbicacionController>(
      C31CarpetasUbicacionController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
