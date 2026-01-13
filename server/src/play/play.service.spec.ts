import { Test, TestingModule } from '@nestjs/testing';
import { PlayService } from './play.service';
import { PinoLogger } from 'nestjs-pino';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { LeaderboardCacheService } from 'src/redis/cache/leaderboard-cache.service';
import { StandingsCacheService } from 'src/redis/cache/standings-cache.service';
import { GameProgressCacheService } from 'src/redis/cache/game-progress-cache.service';

describe('PlayService', () => {
  let service: PlayService;

  const mockLeaderboardCacheService = {
    updateScore: jest.fn(),
    getAll: jest.fn(),
  };

  const mockProgressCacheService = {
    submitRoundResult: jest.fn(),
  };

  const mockStandingsCacheService = {
    updateScore: jest.fn(),
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
        {
          provide: GameProgressCacheService,
          useValue: mockProgressCacheService,
        },
        { provide: StandingsCacheService, useValue: mockStandingsCacheService },

        { provide: PinoLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<PlayService>(PlayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
