import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

jest.mock('./entities/notas-entrega.entity', () => ({
  NotasEntrega: class NotasEntrega {},
}));

import { ActasEntregaService as ActasEntregaService } from './actas-entrega.service';
import { ActasEntrega } from './entities/actas-entrega.entity';

describe('NotasEntregaService', () => {
  let service: ActasEntregaService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    findAndCount: jest.Mock;
    findOne: jest.Mock;
    softRemove: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      softRemove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActasEntregaService,
        {
          provide: getRepositoryToken(ActasEntrega),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<ActasEntregaService>(ActasEntregaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a nota even when no authenticated user is provided', async () => {
    const dto = {
      numeroNota: 'AE-2026-001',
      oficinaOrigen: 'Tesorería',
      fechaEntrega: '2026-07-20',
    };
    const createdNota = { id: 1, ...dto };

    repo.create.mockReturnValue(createdNota);
    repo.save.mockResolvedValue(createdNota);

    await expect(service.create(dto as any, undefined)).resolves.toBe(
      createdNota,
    );
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ...dto,
        creadoPorId: undefined,
      }),
    );
  });
});
