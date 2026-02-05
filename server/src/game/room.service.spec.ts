/* eslint-disable @typescript-eslint/unbound-method  */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { RoomService } from './room.service';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { GamePhase } from 'src/common/constants';
import { InternalError } from 'src/common/exceptions/internal-error';

describe('RoomService', () => {
  let service: RoomService;
  let gameRoomCache: jest.Mocked<GameRoomCacheService>;

  beforeEach(async () => {
    const mockGameRoomCache = {
      getRoom: jest.fn(),
      saveRoom: jest.fn(),
      deleteRoom: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        {
          provide: GameRoomCacheService,
          useValue: mockGameRoomCache,
        },
      ],
    }).compile();

    service = module.get<RoomService>(RoomService);
    gameRoomCache = module.get(GameRoomCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRoom', () => {
    it('방을 생성하고 roomId를 반환한다.', async () => {
      // given
      const maxPlayer = 4;
      const drawingTime = 60;
      const totalRounds = 3;

      gameRoomCache.getRoom.mockResolvedValue(null); // ID 중복 체크 통과

      // when
      const result = await service.createRoom(
        maxPlayer,
        drawingTime,
        totalRounds,
      );

      // then
      expect(result).toHaveLength(8);
      expect(gameRoomCache.saveRoom).toHaveBeenCalled();
    });
  });

  describe('updateSettings', () => {
    it('방 설정을 업데이트하고 저장한다.', async () => {
      // given
      const room = {
        roomId: 'test',
        settings: {
          maxPlayer: 4,
          drawingTime: 60,
          totalRounds: 3,
        },
      } as any;

      const newMaxPlayer = 6;
      const newDrawingTime = 90;
      const newTotalRounds = 5;

      // when
      const result = await service.updateSettings(
        room,
        newMaxPlayer,
        newDrawingTime,
        newTotalRounds,
      );

      // then
      expect(result.settings.maxPlayer).toBe(newMaxPlayer);
      expect(result.settings.drawingTime).toBe(newDrawingTime);
      expect(result.settings.totalRounds).toBe(newTotalRounds);
      expect(gameRoomCache.saveRoom).toHaveBeenCalledWith(room.roomId, room);
    });
  });

  describe('getRoom', () => {
    it('방이 존재하지 않으면 에러를 던진다.', async () => {
      // given
      const roomId = 'test';
      gameRoomCache.getRoom.mockResolvedValue(null);

      // when & then
      await expect(service.getRoom(roomId)).rejects.toThrow(InternalError);
    });
  });

  describe('isWaiting', () => {
    it('방 상태가 WAITING이면 true를 반환한다.', async () => {
      // given
      const roomId = 'test';
      gameRoomCache.getRoom.mockResolvedValue({
        phase: GamePhase.WAITING,
      } as any);

      // when
      const result = await service.isWaiting(roomId);

      // then
      expect(result).toBe(true);
    });

    it('방 상태가 WAITING이 아니면 false를 반환한다.', async () => {
      // given
      const roomId = 'test';
      gameRoomCache.getRoom.mockResolvedValue({
        phase: GamePhase.PROMPT,
      } as any);

      // when
      const result = await service.isWaiting(roomId);

      // then
      expect(result).toBe(false);
    });

    it('방이 존재하지 않으면 에러를 던진다.', async () => {
      // given
      const roomId = 'test';
      gameRoomCache.getRoom.mockResolvedValue(null);

      // when & then
      await expect(service.isWaiting(roomId)).rejects.toThrow(InternalError);
    });
  });

  describe('deleteRoom', () => {
    it('방을 삭제한다.', async () => {
      // given
      const roomId = 'test';

      // when
      await service.deleteRoom(roomId);

      // then
      expect(gameRoomCache.deleteRoom).toHaveBeenCalledWith(roomId);
    });
  });
});
