import { Test, TestingModule } from '@nestjs/testing';
import { C31ChequesService } from './c31-cheques.service';

describe('C31ChequesService', () => {
  let service: C31ChequesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [C31ChequesService],
    }).compile();

    service = module.get<C31ChequesService>(C31ChequesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
