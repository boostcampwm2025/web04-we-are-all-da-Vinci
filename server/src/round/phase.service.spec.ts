import { Test, TestingModule } from '@nestjs/testing';
import { PhaseService } from './phase.service';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { PromptService } from 'src/prompt/prompt.service';
import { GameProgressCacheService } from 'src/redis/cache/game-progress-cache.service';
import { StandingsCacheService } from 'src/redis/cache/standings-cache.service';
import { LeaderboardCacheService } from 'src/redis/cache/leaderboard-cache.service';
import {
  ClientEvents,
  GAME_END_TIME,
  GamePhase,
  PROMPT_TIME,
  ROUND_REPLAY_TIME,
  ROUND_STANDING_TIME,
} from 'src/common/constants';

describe('PhaseService', () => {
  let service: PhaseService;

  const mockPromptStrokes = [
    {
      points: [
        [186, 242, 249, 250],
        [74, 71, 73, 77],
      ],
      color: [0, 0, 0],
    },
  ];

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

  const mockRoundResults = [
    {
      socketId: 'test1',
      strokes: mockPromptStrokes,
      similarity: {
        similarity: 40,
        strokeCountSimilarity: 10,
        strokeMatchSimilarity: 10,
        shapeSimilarity: 20,
      },
    },
    {
      socketId: 'test2',
      strokes: mockPromptStrokes,
      similarity: {
        similarity: 70,
        strokeCountSimilarity: 20,
        strokeMatchSimilarity: 30,
        shapeSimilarity: 20,
      },
    },
  ];

  const mockStandings = [
    {
      socketId: 'test1',
      score: 100,
    },
    {
      socketId: 'test2',
      score: 200,
    },
  ];

  const mockHighlight = {
    socketId: 'test1',
    strokes: mockPromptStrokes,
    similarity: {
      similarity: 40,
      strokeCountSimilarity: 10,
      strokeMatchSimilarity: 10,
      shapeSimilarity: 20,
    },
  };

  const mockCacheService = {
    saveRoom: jest.fn(),
    getRoom: jest.fn(),
  };

  const mockPromptService = {
    getPromptForRound: jest.fn(),
    resetPromptIds: jest.fn(),
  };

  const mockProgressService = {
    getRoundResults: jest.fn(() => Promise.resolve(mockRoundResults)),
    getHighlight: jest.fn(() => Promise.resolve(mockHighlight)),
    deleteAll: jest.fn(),
  };

  const mockStandingsService = {
    getStandings: jest.fn(),
    deleteAll: jest.fn(),
  };

  const mockLeaderboardService = {
    deleteAll: jest.fn(),
    getStandings: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhaseService,
        { provide: GameRoomCacheService, useValue: mockCacheService },
        { provide: PromptService, useValue: mockPromptService },
        { provide: GameProgressCacheService, useValue: mockProgressService },
        { provide: StandingsCacheService, useValue: mockStandingsService },
        { provide: LeaderboardCacheService, useValue: mockLeaderboardService },
      ],
    }).compile();

    service = module.get<PhaseService>(PhaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('waiting', () => {
    it('게임이 모두 종료되면, 게임 상태가 초기화된다.', async () => {
      // given
      const room = {
        ...mockBaseRoom,
        phase: GamePhase.GAME_END,
        currentRound: 1,
      };

      // when
      await service.waiting(room);

      // then
      expect(room.phase).toBe(GamePhase.WAITING);
      expect(room.currentRound).toBe(0);
    });

    it('게임이 모두 종료되면, 게임 관련 데이터를 삭제한다.', async () => {
      // given
      const room = {
        ...mockBaseRoom,
        phase: GamePhase.GAME_END,
        currentRound: 1,
      };

      // when
      await service.waiting(room);

      // then
      expect(mockProgressService.deleteAll).toHaveBeenCalled();
      expect(mockStandingsService.deleteAll).toHaveBeenCalled();
      expect(mockLeaderboardService.deleteAll).toHaveBeenCalled();
    });
  });

  describe('prompt', () => {
    it('게임을 시작하면, 제시 그림을 반환한다.', async () => {
      // given
      const room = {
        ...mockBaseRoom,
        phase: GamePhase.WAITING,
        currentRound: 0,
      };

      mockPromptService.getPromptForRound.mockResolvedValue(mockPromptStrokes);

      // when
      const result = await service.prompt(room);

      // then
      expect(result).toEqual({
        events: [
          {
            name: ClientEvents.ROOM_PROMPT,
            payload: mockPromptStrokes,
          },
        ],
        timeLeft: PROMPT_TIME,
      });
    });

    it('게임을 시작하면, 게임 라운드가 증가하고 게임 페이즈가 PROMPT로 변경된다.', async () => {
      // given
      const room = {
        ...mockBaseRoom,
        phase: GamePhase.WAITING,
        currentRound: 0,
      };

      mockPromptService.getPromptForRound.mockResolvedValue(mockPromptStrokes);

      // when
      await service.prompt(room);

      // then
      expect(room.currentRound).toBe(1);
      expect(room.phase).toBe(GamePhase.PROMPT);
    });

    it('제시 그림이 없으면, 에러를 반환한다.', async () => {
      // given
      const room = {
        ...mockBaseRoom,
        phase: GamePhase.WAITING,
        currentRound: 0,
      };

      mockPromptService.getPromptForRound.mockResolvedValue(null);

      // when & then
      await expect(service.prompt(room)).rejects.toThrow();
    });
  });

  describe('drawing', () => {
    it('그림 그리기 단계가 시작되면, 게임 페이즈가 DRAWING으로 변경된다.', async () => {
      // given
      const room = {
        ...mockBaseRoom,
        phase: GamePhase.PROMPT,
        currentRound: 1,
      };

      // when
      const result = await service.drawing(room);

      // then
      expect(room.phase).toBe(GamePhase.DRAWING);
      expect(result).toEqual({
        events: [],
        timeLeft: room.settings.drawingTime,
      });
    });
  });

  describe('roundReplay', () => {
    it('라운드 다시보기를 시작하면, 게임 페이즈가 ROUND_REPLAY로 변경된다.', async () => {
      // given
      const room = {
        ...mockBaseRoom,
        phase: GamePhase.DRAWING,
        currentRound: 1,
      };

      // when
      await service.roundReplay(room);

      // then
      expect(room.phase).toBe(GamePhase.ROUND_REPLAY);
    });

    it('라운드 다시보기를 시작하면, 라운드 결과를 반환한다.', async () => {
      // given
      const room = {
        ...mockBaseRoom,
        phase: GamePhase.DRAWING,
        currentRound: 1,
      };

      mockCacheService.getRoom.mockResolvedValue(room);
      mockProgressService.getRoundResults.mockResolvedValue(mockRoundResults);
      mockPromptService.getPromptForRound.mockResolvedValue(mockPromptStrokes);

      // when
      const result = await service.roundReplay(room);

      // then
      expect(result.timeLeft).toEqual(ROUND_REPLAY_TIME);
      expect(result.events.length).toEqual(1);
      expect(result.events[0].name).toEqual(ClientEvents.ROOM_ROUND_REPLAY);

      expect(result.events[0].payload?.rankings).not.toBeNull();
      expect(result.events[0].payload?.promptStrokes).not.toBeNull();

      const rankings = result.events[0].payload?.rankings;
      const strokes = result.events[0].payload?.promptStrokes;

      expect(rankings?.[0].socketId).toEqual(mockPlayers[1].socketId);
      expect(rankings?.[1].socketId).toEqual(mockPlayers[0].socketId);
      expect(strokes).toEqual(mockPromptStrokes);
    });
  });

  describe('roundStanding', () => {
    it('라운드 순위보기를 시작하면, 게임 페이즈가 ROUND_STANDING으로 변경된다.', async () => {
      // given
      const room = {
        ...mockBaseRoom,
        phase: GamePhase.ROUND_REPLAY,
        currentRound: 1,
      };

      mockCacheService.getRoom.mockResolvedValue(room);
      mockStandingsService.getStandings.mockResolvedValue(mockStandings);

      // when
      await service.roundStanding(room);

      // then
      expect(room.phase).toBe(GamePhase.ROUND_STANDING);
    });

    it('라운드 순위보기를 시작하면, 라운드 순위를 반환한다.', async () => {
      // given
      const room = {
        ...mockBaseRoom,
        phase: GamePhase.ROUND_REPLAY,
        currentRound: 1,
      };

      mockCacheService.getRoom.mockResolvedValue(room);
      mockStandingsService.getStandings.mockResolvedValue(mockStandings);

      // when
      const result = await service.roundStanding(room);

      // then
      expect(result.timeLeft).toEqual(ROUND_STANDING_TIME);
      expect(result.events.length).toEqual(1);
      expect(result.events[0].name).toEqual(ClientEvents.ROOM_ROUND_STANDING);

      expect(result.events[0].payload?.rankings).not.toBeNull();

      const rankings = result.events[0].payload?.rankings;

      expect(rankings?.[0].socketId).toEqual(mockPlayers[0].socketId);
      expect(rankings?.[1].socketId).toEqual(mockPlayers[1].socketId);
    });
  });

  describe('gameEnd', () => {
    it('게임이 끝나면, 게임 페이즈가 GAME_END로 변경된다.', async () => {
      // given
      const room = {
        ...mockBaseRoom,
        phase: GamePhase.ROUND_STANDING,
        currentRound: 1,
      };

      // when
      await service.gameEnd(room);

      // then
      expect(room.phase).toBe(GamePhase.GAME_END);
    });

    it('게임이 끝나면, 게임 종료 결과를 반환한다.', async () => {
      // given
      const room = {
        ...mockBaseRoom,
        phase: GamePhase.ROUND_STANDING,
        currentRound: 1,
      };

      mockProgressService.getHighlight.mockResolvedValue(mockHighlight);
      mockLeaderboardService.getStandings.mockResolvedValue(mockStandings);

      // when
      const result = await service.gameEnd(room);

      // then
      expect(result.timeLeft).toEqual(GAME_END_TIME);
      expect(result.events.length).toEqual(1);
      expect(result.events[0].name).toEqual(ClientEvents.ROOM_GAME_END);

      expect(result.events[0].payload?.highlight).not.toBeNull();
      expect(result.events[0].payload?.finalRankings).not.toBeNull();
    });
  });
});
