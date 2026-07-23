import { Test, TestingModule } from '@nestjs/testing';
import { ComprobantesC31Controller } from './comprobantes_c31.controller';
import { ComprobantesC31Service } from './comprobantes_c31.service';

describe('ComprobantesC31Controller', () => {
  let controller: ComprobantesC31Controller;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComprobantesC31Controller],
      providers: [ComprobantesC31Service],
    }).compile();

    controller = module.get<ComprobantesC31Controller>(
      ComprobantesC31Controller,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
