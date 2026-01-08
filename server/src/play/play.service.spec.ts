import { Test, TestingModule } from '@nestjs/testing';
import { PlayService } from './play.service';
import { PinoLogger } from 'nestjs-pino';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { LeaderboardCacheService } from 'src/redis/cache/leaderboard-cache.service';

describe('PlayService', () => {
  let service: PlayService;

  const mockLeaderboardCacheService = {
    updateScore: jest.fn(),
    getAll: jest.fn(),
  };

  const mockCacheService = {
    getPlayers: jest.fn(),
  };

  const mockLogger = {
    error: jest.fn(),
    info: jest.fn(),
    setContext: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayService,
        {
          provide: LeaderboardCacheService,
          useValue: mockLeaderboardCacheService,
        },
        { provide: GameRoomCacheService, useValue: mockCacheService },
        { provide: PinoLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<PlayService>(PlayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
