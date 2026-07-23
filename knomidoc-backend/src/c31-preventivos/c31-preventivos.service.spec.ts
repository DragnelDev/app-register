import { Test, TestingModule } from '@nestjs/testing';
import { C31PreventivosService } from './c31-preventivos.service';

describe('C31PreventivosService', () => {
  let service: C31PreventivosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [C31PreventivosService],
    }).compile();

    service = module.get<C31PreventivosService>(C31PreventivosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
