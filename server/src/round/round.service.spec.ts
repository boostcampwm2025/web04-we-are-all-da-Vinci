import { Test, TestingModule } from '@nestjs/testing';
import { RoundService } from './round.service';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';

describe('RoundService', () => {
  let service: RoundService;

  const mockCacheService = {
    saveRoom: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoundService,
        { provide: GameRoomCacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<RoundService>(RoundService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
