import { Test, TestingModule } from '@nestjs/testing';
import { RoundService } from './round.service';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { GameProgressCacheService } from 'src/redis/cache/game-progress-cache.service';
import { StandingsCacheService } from 'src/redis/cache/standings-cache.service';
import { TimerService } from 'src/timer/timer.service';
import { PinoLogger } from 'nestjs-pino';

describe('RoundService', () => {
  let service: RoundService;

  const mockCacheService = {
    saveRoom: jest.fn(),
  };

  const mockProgressCacheService = {
    getRoundResults: jest.fn(),
    getHighlight: jest.fn(),
  };

  const mockStandingsCacheService = {
    getStandings: jest.fn(),
  };

  const mockTimerService = {
    setOnTimerEnd: jest.fn(),
    startTimer: jest.fn(),
  };

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    setContext: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoundService,
        { provide: GameRoomCacheService, useValue: mockCacheService },
        {
          provide: GameProgressCacheService,
          useValue: mockProgressCacheService,
        },
        { provide: StandingsCacheService, useValue: mockStandingsCacheService },
        { provide: TimerService, useValue: mockTimerService },
        { provide: PinoLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<RoundService>(RoundService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
