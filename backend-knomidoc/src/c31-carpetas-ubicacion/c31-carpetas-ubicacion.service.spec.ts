import { Test, TestingModule } from '@nestjs/testing';
import { C31CarpetasUbicacionService } from './c31-carpetas-ubicacion.service';

describe('C31CarpetasUbicacionService', () => {
  let service: C31CarpetasUbicacionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [C31CarpetasUbicacionService],
    }).compile();

    service = module.get<C31CarpetasUbicacionService>(
      C31CarpetasUbicacionService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
