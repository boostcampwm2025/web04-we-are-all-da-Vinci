/* eslint-disable @typescript-eslint/unbound-method  */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { PlayService } from './play.service';
import { PinoLogger } from 'nestjs-pino';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { LeaderboardCacheService } from 'src/redis/cache/leaderboard-cache.service';
import { StandingsCacheService } from 'src/redis/cache/standings-cache.service';
import { GameProgressCacheService } from 'src/redis/cache/game-progress-cache.service';
import { GamePhase } from '@shared/types';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';
import { Stroke } from 'src/common/types';

describe('PlayService', () => {
  let service: PlayService;
  let leaderboardCacheService: jest.Mocked<LeaderboardCacheService>;
  let progressCacheService: jest.Mocked<GameProgressCacheService>;
  let standingsCacheService: jest.Mocked<StandingsCacheService>;
  let cacheService: jest.Mocked<GameRoomCacheService>;

  const mockPlayers = [
    {
      socketId: 'test1',
      profileId: 'test1',
      nickname: 'test1',
      isHost: true,
    },
    {
      socketId: 'test2',
      profileId: 'test2',
      nickname: 'test2',
      isHost: false,
    },
  ];

  const mockBaseRoom = {
    roomId: 'test',
    phase: GamePhase.WAITING,
    currentRound: 0,
    players: mockPlayers,
    settings: {
      totalRounds: 1,
      drawingTime: 1,
      maxPlayer: 4,
    },
  };

  beforeEach(async () => {
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
      getRoom: jest.fn(),
      getAllPlayers: jest.fn(),
    };

    const mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
      setContext: jest.fn(),
    };

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
    leaderboardCacheService = module.get(LeaderboardCacheService);
    progressCacheService = module.get(GameProgressCacheService);
    standingsCacheService = module.get(StandingsCacheService);
    cacheService = module.get(GameRoomCacheService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateScore', () => {
    it('유사도 점수를 업데이트하고 실시간 랭킹을 반환한다.', async () => {
      // given
      const roomId = mockBaseRoom.roomId;
      const socketId = mockPlayers[0].socketId;
      const score = 100;

      cacheService.getAllPlayers.mockResolvedValue(mockPlayers);
      leaderboardCacheService.getAll.mockResolvedValue([
        {
          value: mockPlayers[0].profileId,
          score,
        },
      ]);

      // when
      const result = await service.updateScore(roomId, socketId, score);

      // then
      expect(result).toEqual([
        {
          profileId: mockPlayers[0].profileId,
          similarity: score,
          nickname: mockPlayers[0].nickname,
          socketId: mockPlayers[0].socketId,
        },
      ]);
    });

    it('게임 방이 존재하지 않으면, 제출할 수 없다.', async () => {
      // given
      const roomId = mockBaseRoom.roomId;
      const socketId = mockPlayers[0].socketId;
      const score = 100;

      cacheService.getAllPlayers.mockResolvedValue(null as any);

      // when & then
      await expect(
        service.updateScore(roomId, socketId, score),
      ).rejects.toThrow(WebsocketException);
    });

    it('유저가 게임에 참여하지 않았으면, 제출할 수 없다.', async () => {
      // given
      const roomId = mockBaseRoom.roomId;
      const socketId = 'not-in-room-socket-id';
      const score = 100;

      cacheService.getAllPlayers.mockResolvedValue(mockPlayers);

      // when & then
      await expect(
        service.updateScore(roomId, socketId, score),
      ).rejects.toThrow(WebsocketException);
    });
  });

  describe('submitDrawing', () => {
    const mockSimilarity = {
      similarity: 10,
      strokeCountSimilarity: 10,
      strokeMatchSimilarity: 10,
      shapeSimilarity: 10,
    };
    const mockStrokes: Stroke[] = [
      {
        points: [[0], [0]],
        color: [0, 0, 0],
      },
    ];

    it('그림을 제출하면 랭킹을 업데이트하고, 플레이어, 라운드 별로 저장한다.', async () => {
      // given
      const roomId = mockBaseRoom.roomId;
      const socketId = mockPlayers[0].socketId;
      const room = { ...mockBaseRoom, phase: GamePhase.DRAWING };

      cacheService.getRoom.mockResolvedValue(room);

      // when
      await service.submitDrawing(
        roomId,
        socketId,
        mockSimilarity,
        mockStrokes,
      );

      // then
      expect(progressCacheService.submitRoundResult).toHaveBeenCalledWith(
        roomId,
        room.currentRound,
        mockPlayers[0].profileId,
        mockStrokes,
        mockSimilarity,
      );
      expect(standingsCacheService.updateScore).toHaveBeenCalledWith(
        roomId,
        mockPlayers[0].profileId,
        mockSimilarity,
      );
    });

    it('게임 방이 존재하지 않으면, 제출할 수 없다.', async () => {
      // given
      const roomId = mockBaseRoom.roomId;
      const socketId = mockPlayers[0].socketId;

      cacheService.getRoom.mockResolvedValue(null);

      // when & then
      await expect(
        service.submitDrawing(roomId, socketId, mockSimilarity, mockStrokes),
      ).rejects.toThrow(WebsocketException);
    });

    it('유저가 게임에 참여하지 않았으면, 제출할 수 없다.', async () => {
      // given
      const roomId = mockBaseRoom.roomId;
      const socketId = 'not-in-room-socket-id';
      const room = { ...mockBaseRoom, phase: GamePhase.DRAWING };

      cacheService.getRoom.mockResolvedValue(room);

      // when & then
      await expect(
        service.submitDrawing(roomId, socketId, mockSimilarity, mockStrokes),
      ).rejects.toThrow(WebsocketException);
    });

    it('게임이 그리기(DRAWING) 단계가 아니면, 제출할 수 없다.', async () => {
      // given
      const roomId = mockBaseRoom.roomId;
      const socketId = mockPlayers[0].socketId;
      const room = { ...mockBaseRoom, phase: GamePhase.WAITING };

      cacheService.getRoom.mockResolvedValue(room);

      // when & then
      await expect(
        service.submitDrawing(roomId, socketId, mockSimilarity, mockStrokes),
      ).rejects.toThrow(WebsocketException);
    });

    it('유저가 이미 그림을 제출했으면, 제출할 수 없다.', async () => {
      // given
      const roomId = mockBaseRoom.roomId;
      const socketId = mockPlayers[0].socketId;
      const room = { ...mockBaseRoom, phase: GamePhase.DRAWING };

      cacheService.getRoom.mockResolvedValue(room);
      progressCacheService.submitRoundResult.mockRejectedValue(
        new WebsocketException('이미 제출하였습니다.'),
      );

      // when & then
      await expect(
        service.submitDrawing(roomId, socketId, mockSimilarity, mockStrokes),
      ).rejects.toThrow(WebsocketException);
    });
  });
});
