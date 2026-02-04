import { Test, TestingModule } from '@nestjs/testing';
import { RoundService } from './round.service';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { TimerService } from 'src/timer/timer.service';
import { PinoLogger } from 'nestjs-pino';
import { PhaseService } from './phase.service';
import {
  GAME_END_TIME,
  GamePhase,
  PROMPT_TIME,
  ROUND_REPLAY_TIME,
  ROUND_STANDING_TIME,
} from 'src/common/constants';

describe('RoundService', () => {
  let service: RoundService;
  const mockCacheService = {
    saveRoom: jest.fn(),
  };

  const mockPhaseService = {
    prompt: jest.fn(),
    drawing: jest.fn(),
    roundReplay: jest.fn(),
    roundStanding: jest.fn(),
    gameEnd: jest.fn(),
    waiting: jest.fn(),
  };

  const mockTimerService = {
    setOnTimerEnd: jest.fn(),
    startTimer: jest.fn(),
    cancelTimer: jest.fn(),
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
        { provide: PhaseService, useValue: mockPhaseService },
        { provide: TimerService, useValue: mockTimerService },
        { provide: PinoLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<RoundService>(RoundService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('nextPhase', () => {
    it('게임이 대기 중이면 그림 제시 단계로 넘어간다.', async () => {
      // given
      const room = {
        roomId: 'test',
        phase: GamePhase.WAITING,
        currentRound: 0,
        players: [],
        settings: {
          totalRounds: 1,
          drawingTime: 1,
          maxPlayer: 4,
        },
      };

      mockPhaseService.prompt.mockResolvedValue({
        events: [],
        timeLeft: PROMPT_TIME,
      });

      // when
      await service.nextPhase(room);

      // then
      expect(mockPhaseService.prompt).toHaveBeenCalledWith(room);
      expect(mockTimerService.startTimer).toHaveBeenCalledWith(
        room.roomId,
        PROMPT_TIME,
      );
    });

    it('그림 제시 단계면 그림 그리기 단계로 넘어간다.', async () => {
      // given
      const room = {
        roomId: 'test',
        phase: GamePhase.PROMPT,
        currentRound: 1,
        players: [],
        settings: {
          totalRounds: 1,
          drawingTime: 1,
          maxPlayer: 4,
        },
      };

      mockPhaseService.drawing.mockResolvedValue({
        events: [],
        timeLeft: room.settings.drawingTime,
      });

      // when
      await service.nextPhase(room);

      // then
      expect(mockPhaseService.drawing).toHaveBeenCalledWith(room);
      expect(mockTimerService.startTimer).toHaveBeenCalledWith(
        room.roomId,
        room.settings.drawingTime,
      );
    });

    it('그림 그리기 단계면 라운드 다시 보기 단계로 넘어간다.', async () => {
      // given
      const room = {
        roomId: 'test',
        phase: GamePhase.DRAWING,
        currentRound: 1,
        players: [],
        settings: {
          totalRounds: 1,
          drawingTime: 1,
          maxPlayer: 4,
        },
      };

      mockPhaseService.roundReplay.mockResolvedValue({
        events: [],
        timeLeft: ROUND_REPLAY_TIME,
      });

      // when
      await service.nextPhase(room);

      // then
      expect(mockPhaseService.roundReplay).toHaveBeenCalledWith(room);
      expect(mockTimerService.startTimer).toHaveBeenCalledWith(
        room.roomId,
        ROUND_REPLAY_TIME,
      );
    });

    it('라운드 다시 보기 단계면 라운드 순위 단계로 넘어간다.', async () => {
      // given
      const room = {
        roomId: 'test',
        phase: GamePhase.ROUND_REPLAY,
        currentRound: 1,
        players: [],
        settings: {
          totalRounds: 1,
          drawingTime: 1,
          maxPlayer: 4,
        },
      };

      mockPhaseService.roundStanding.mockResolvedValue({
        events: [],
        timeLeft: ROUND_STANDING_TIME,
      });

      // when
      await service.nextPhase(room);

      // then
      expect(mockPhaseService.roundStanding).toHaveBeenCalledWith(room);
      expect(mockTimerService.startTimer).toHaveBeenCalledWith(
        room.roomId,
        ROUND_STANDING_TIME,
      );
    });

    it('라운드 순위 단계이고, 모든 라운드가 끝나지 않았다면 그림 제시 단계로 넘어간다.', async () => {
      // given
      const room = {
        roomId: 'test',
        phase: GamePhase.ROUND_STANDING,
        currentRound: 1,
        players: [],
        settings: {
          totalRounds: 2,
          drawingTime: 1,
          maxPlayer: 4,
        },
      };

      mockPhaseService.prompt.mockResolvedValue({
        events: [],
        timeLeft: PROMPT_TIME,
      });

      // when
      await service.nextPhase(room);

      // then
      expect(mockPhaseService.prompt).toHaveBeenCalledWith(room);
      expect(mockTimerService.startTimer).toHaveBeenCalledWith(
        room.roomId,
        PROMPT_TIME,
      );
    });

    it('라운드 순위 단계이고, 모든 라운드가 끝났다면 게임 종료 단계로 넘어간다.', async () => {
      // given
      const room = {
        roomId: 'test',
        phase: GamePhase.ROUND_STANDING,
        currentRound: 2,
        players: [],
        settings: {
          totalRounds: 2,
          drawingTime: 1,
          maxPlayer: 4,
        },
      };

      mockPhaseService.gameEnd.mockResolvedValue({
        events: [],
        timeLeft: GAME_END_TIME,
      });

      // when
      await service.nextPhase(room);

      // then
      expect(mockPhaseService.gameEnd).toHaveBeenCalledWith(room);
      expect(mockTimerService.startTimer).toHaveBeenCalledWith(
        room.roomId,
        GAME_END_TIME,
      );
    });

    it('게임 종료 단계면 게임을 종료하고 대기 단계로 넘어간다.', async () => {
      // given
      const room = {
        roomId: 'test',
        phase: GamePhase.GAME_END,
        currentRound: 1,
        players: [],
        settings: {
          totalRounds: 1,
          drawingTime: 1,
          maxPlayer: 4,
        },
      };

      mockPhaseService.waiting.mockResolvedValue({
        events: [],
        timeLeft: 0,
      });

      // when
      await service.nextPhase(room);

      // then
      expect(mockPhaseService.waiting).toHaveBeenCalledWith(room);
      expect(mockTimerService.cancelTimer).toHaveBeenCalledWith(room.roomId);
    });
  });
});
