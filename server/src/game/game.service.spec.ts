/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { GameRoomCacheService } from '../redis/cache/game-room-cache.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { GameRoom } from '../common/types/game-room.types';
import { WaitlistCacheService } from 'src/redis/cache/waitlist-cache.service';
import { PlayerCacheService } from 'src/redis/cache/player-cache.service';
import { PinoLogger } from 'nestjs-pino';
import { RoundService } from 'src/round/round.service';

describe('GameService', () => {
  let service: GameService;
  let cacheService: jest.Mocked<GameRoomCacheService>;

  beforeEach(async () => {
    const mockCacheService = {
      getRoom: jest.fn(),
      saveRoom: jest.fn(),
    };
    const mockWaitlistService = {
      addPlayer: jest.fn(),
    };
    const mockPlayerCacheService = {
      set: jest.fn(),
      delete: jest.fn(),
    };
    const mockRoundService = {};

    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: GameRoomCacheService,
          useValue: mockCacheService,
        },
        {
          provide: WaitlistCacheService,
          useValue: mockWaitlistService,
        },
        {
          provide: PlayerCacheService,
          useValue: mockPlayerCacheService,
        },
        {
          provide: RoundService,
          useValue: mockRoundService,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    cacheService = module.get(GameRoomCacheService);
  });

  describe('방 생성', () => {
    const createRoomDto: CreateRoomDto = {
      maxPlayer: 4,
      totalRounds: 5,
      drawingTime: 90,
    };

    it('사용자 설정으로 방을 생성한다', async () => {
      cacheService.getRoom.mockResolvedValue(null);
      cacheService.saveRoom.mockResolvedValue(undefined);

      const roomId = await service.createRoom(createRoomDto);

      expect(roomId).toBeDefined();
      expect(typeof roomId).toBe('string');
      expect(roomId).toHaveLength(8);
    });

    it('올바른 설정으로 방을 캐시에 저장한다', async () => {
      cacheService.getRoom.mockResolvedValue(null);
      cacheService.saveRoom.mockResolvedValue(undefined);

      const roomId = await service.createRoom(createRoomDto);

      expect(cacheService.saveRoom).toHaveBeenCalledWith(
        roomId,
        expect.objectContaining({
          roomId,
          players: [],
          phase: 'WAITING',
          currentRound: 0,
          settings: {
            drawingTime: 90,
            maxPlayer: 4,
            totalRounds: 5,
          },
        }),
      );
    });

    it('방 ID 충돌 시 고유한 ID를 재생성한다', async () => {
      const existingRoom: GameRoom = {
        roomId: 'existing',
        players: [],
        phase: 'WAITING',
        currentRound: 0,
        settings: {
          drawingTime: 90,
          maxPlayer: 4,
          totalRounds: 5,
        },
      };

      cacheService.getRoom
        .mockResolvedValueOnce(existingRoom)
        .mockResolvedValueOnce(null);
      cacheService.saveRoom.mockResolvedValue(undefined);

      const roomId = await service.createRoom(createRoomDto);

      expect(roomId).toBeDefined();
      expect(cacheService.getRoom).toHaveBeenCalledTimes(2);
    });

    it('다양한 설정으로 방을 생성한다', async () => {
      const customDto: CreateRoomDto = {
        maxPlayer: 6,
        totalRounds: 10,
        drawingTime: 120,
      };

      cacheService.getRoom.mockResolvedValue(null);
      cacheService.saveRoom.mockResolvedValue(undefined);

      await service.createRoom(customDto);

      expect(cacheService.saveRoom).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          settings: {
            drawingTime: 120,
            maxPlayer: 6,
            totalRounds: 10,
          },
        }),
      );
    });
  });
});
