/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { ErrorCode } from 'src/common/constants/error-code';
import { PromptService } from 'src/prompt/prompt.service';
import { LeaderboardCacheService } from 'src/redis/cache/leaderboard-cache.service';
import { PlayerCacheService } from 'src/redis/cache/player-cache.service';
import { WaitlistCacheService } from 'src/redis/cache/waitlist-cache.service';
import { RoundService } from 'src/round/round.service';
import { GameRoom, Player } from '../common/types/game-room.types';
import { GameRoomCacheService } from '../redis/cache/game-room-cache.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { GameService } from './game.service';

describe('GameService', () => {
  let service: GameService;
  let cacheService: jest.Mocked<GameRoomCacheService>;
  let roundService: jest.Mocked<RoundService>;
  let promptService: jest.Mocked<PromptService>;
  let playerCacheService: jest.Mocked<PlayerCacheService>;
  let leaderboardCacheService: jest.Mocked<LeaderboardCacheService>;

  const createMockPlayer = (
    socketId: string,
    isHost: boolean = false,
  ): Player => ({
    socketId,
    nickname: `Player-${socketId}`,
    profileId: `profile-${socketId}`,
    isHost,
  });

  const createMockRoom = (
    overrides: Partial<GameRoom> = {},
    players: Player[] = [],
  ): GameRoom => ({
    roomId: 'test-room',
    players,
    phase: 'WAITING',
    currentRound: 0,
    settings: {
      drawingTime: 90,
      maxPlayer: 4,
      totalRounds: 5,
    },
    ...overrides,
  });

  beforeEach(async () => {
    const mockCacheService = {
      getRoom: jest.fn(),
      saveRoom: jest.fn(),
      getAllPlayers: jest.fn(),
      addPlayer: jest.fn(),
      deletePlayer: jest.fn(),
      setPlayer: jest.fn(),
    };
    const mockWaitlistService = {
      addPlayer: jest.fn(),
    };
    const mockPlayerCacheService = {
      set: jest.fn(),
      delete: jest.fn(),
      getRoomId: jest.fn(),
    };
    const mockLeaderboardCacheService = {
      updateScore: jest.fn(),
      delete: jest.fn(),
    };
    const mockRoundService = {
      nextPhase: jest.fn(),
    };
    const mockPromptService = {
      setPromptIds: jest.fn(),
      resetPromptIds: jest.fn(),
    };

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
          provide: LeaderboardCacheService,
          useValue: mockLeaderboardCacheService,
        },
        {
          provide: RoundService,
          useValue: mockRoundService,
        },
        {
          provide: PromptService,
          useValue: mockPromptService,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    cacheService = module.get(GameRoomCacheService);
    roundService = module.get(RoundService);
    promptService = module.get(PromptService);
    playerCacheService = module.get(PlayerCacheService);
    leaderboardCacheService = module.get(LeaderboardCacheService);
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

  describe('게임 설정 변경', () => {
    const hostPlayer = createMockPlayer('host-socket', true);
    const guestPlayer = createMockPlayer('guest-socket', false);

    it('호스트가 설정을 변경하면 성공한다', async () => {
      const room = createMockRoom({}, [hostPlayer, guestPlayer]);
      cacheService.getRoom.mockResolvedValue(room);
      cacheService.saveRoom.mockResolvedValue(undefined);

      const result = await service.updateGameSettings(
        'test-room',
        'host-socket',
        6,
        10,
        120,
      );

      expect(result?.settings).toEqual({
        maxPlayer: 6,
        totalRounds: 10,
        drawingTime: 120,
      });
      expect(cacheService.saveRoom).toHaveBeenCalled();
    });

    it('방이 없으면 에러를 던진다', async () => {
      cacheService.getRoom.mockResolvedValue(null);

      await expect(
        service.updateGameSettings('invalid-room', 'host-socket', 6, 10, 120),
      ).rejects.toThrow(ErrorCode.ROOM_NOT_FOUND);
    });

    it('플레이어가 방에 없으면 에러를 던진다', async () => {
      const room = createMockRoom({}, [hostPlayer]);
      cacheService.getRoom.mockResolvedValue(room);

      await expect(
        service.updateGameSettings('test-room', 'unknown-socket', 6, 10, 120),
      ).rejects.toThrow(ErrorCode.PLAYER_NOT_FOUND);
    });

    it('호스트가 아니면 에러를 던진다', async () => {
      const room = createMockRoom({}, [hostPlayer, guestPlayer]);
      cacheService.getRoom.mockResolvedValue(room);

      await expect(
        service.updateGameSettings('test-room', 'guest-socket', 6, 10, 120),
      ).rejects.toThrow(ErrorCode.PLAYER_NOT_HOST);
    });

    it('WAITING 상태가 아니면 에러를 던진다', async () => {
      const room = createMockRoom({ phase: 'DRAWING' }, [hostPlayer]);
      cacheService.getRoom.mockResolvedValue(room);

      await expect(
        service.updateGameSettings('test-room', 'host-socket', 6, 10, 120),
      ).rejects.toThrow(ErrorCode.UPDATE_SETTINGS_ONLY_WAITING_PHASE);
    });

    it('라운드 수가 변경되면 프롬프트를 재설정한다', async () => {
      const room = createMockRoom({}, [hostPlayer]);
      cacheService.getRoom.mockResolvedValue(room);
      cacheService.saveRoom.mockResolvedValue(undefined);

      await service.updateGameSettings('test-room', 'host-socket', 4, 10, 90);

      expect(promptService.resetPromptIds).toHaveBeenCalledWith(
        'test-room',
        10,
      );
    });
  });

  describe('게임 시작', () => {
    const hostPlayer = createMockPlayer('host-socket', true);
    const guestPlayer = createMockPlayer('guest-socket', false);

    it('호스트가 게임을 시작하면 성공한다', async () => {
      const room = createMockRoom({}, [hostPlayer, guestPlayer]);
      cacheService.getRoom.mockResolvedValue(room);

      await service.startGame('test-room', 'host-socket');

      expect(roundService.nextPhase).toHaveBeenCalledWith(room);
    });

    it('방이 없으면 에러를 던진다', async () => {
      cacheService.getRoom.mockResolvedValue(null);

      await expect(
        service.startGame('invalid-room', 'host-socket'),
      ).rejects.toThrow(ErrorCode.ROOM_NOT_FOUND);
    });

    it('플레이어가 방에 없으면 에러를 던진다', async () => {
      const room = createMockRoom({}, [hostPlayer, guestPlayer]);
      cacheService.getRoom.mockResolvedValue(room);

      await expect(
        service.startGame('test-room', 'unknown-socket'),
      ).rejects.toThrow(ErrorCode.PLAYER_NOT_FOUND);
    });

    it('호스트가 아니면 에러를 던진다', async () => {
      const room = createMockRoom({}, [hostPlayer, guestPlayer]);
      cacheService.getRoom.mockResolvedValue(room);

      await expect(
        service.startGame('test-room', 'guest-socket'),
      ).rejects.toThrow(ErrorCode.PLAYER_NOT_HOST);
    });

    it('이미 게임이 시작되었으면 에러를 던진다', async () => {
      const room = createMockRoom({ phase: 'DRAWING' }, [
        hostPlayer,
        guestPlayer,
      ]);
      cacheService.getRoom.mockResolvedValue(room);

      await expect(
        service.startGame('test-room', 'host-socket'),
      ).rejects.toThrow(ErrorCode.GAME_ALREADY_STARTED);
    });

    it('플레이어가 2명 미만이면 에러를 던진다', async () => {
      const room = createMockRoom({}, [hostPlayer]);
      cacheService.getRoom.mockResolvedValue(room);

      await expect(
        service.startGame('test-room', 'host-socket'),
      ).rejects.toThrow(ErrorCode.PLAYER_ATLEAST_TWO);
    });
  });

  describe('게임 재시작', () => {
    const hostPlayer = createMockPlayer('host-socket', true);
    const guestPlayer = createMockPlayer('guest-socket', false);

    it('호스트가 게임을 재시작하면 성공한다', async () => {
      const room = createMockRoom({ phase: 'GAME_END' }, [
        hostPlayer,
        guestPlayer,
      ]);
      cacheService.getRoom.mockResolvedValue(room);

      await service.restartGame('test-room', 'host-socket');

      expect(roundService.nextPhase).toHaveBeenCalledWith(room);
    });

    it('방이 없으면 에러를 던진다', async () => {
      cacheService.getRoom.mockResolvedValue(null);

      await expect(
        service.restartGame('invalid-room', 'host-socket'),
      ).rejects.toThrow(ErrorCode.ROOM_NOT_FOUND);
    });

    it('플레이어가 방에 없으면 에러를 던진다', async () => {
      const room = createMockRoom({ phase: 'GAME_END' }, [hostPlayer]);
      cacheService.getRoom.mockResolvedValue(room);

      await expect(
        service.restartGame('test-room', 'unknown-socket'),
      ).rejects.toThrow(ErrorCode.PLAYER_NOT_FOUND);
    });

    it('호스트가 아니면 에러를 던진다', async () => {
      const room = createMockRoom({ phase: 'GAME_END' }, [
        hostPlayer,
        guestPlayer,
      ]);
      cacheService.getRoom.mockResolvedValue(room);

      await expect(
        service.restartGame('test-room', 'guest-socket'),
      ).rejects.toThrow(ErrorCode.PLAYER_NOT_HOST);
    });

    it('게임이 종료 상태가 아니면 에러를 던진다', async () => {
      const room = createMockRoom({ phase: 'WAITING' }, [hostPlayer]);
      cacheService.getRoom.mockResolvedValue(room);

      await expect(
        service.restartGame('test-room', 'host-socket'),
      ).rejects.toThrow(ErrorCode.GAME_NOT_END);
    });
  });

  describe('플레이어 강퇴', () => {
    const hostPlayer = createMockPlayer('host-socket', true);
    const guestPlayer = createMockPlayer('guest-socket', false);

    it('호스트가 플레이어를 강퇴하면 성공한다', async () => {
      const room = createMockRoom({}, [hostPlayer, guestPlayer]);
      cacheService.getRoom.mockResolvedValue(room);
      playerCacheService.getRoomId.mockResolvedValue('test-room');
      cacheService.getAllPlayers.mockResolvedValue([hostPlayer, guestPlayer]);
      cacheService.deletePlayer.mockResolvedValue(undefined);
      playerCacheService.delete.mockResolvedValue('test-room');
      leaderboardCacheService.delete.mockResolvedValue(undefined);

      const updatedRoom = createMockRoom({}, [hostPlayer]);
      cacheService.getRoom
        .mockResolvedValueOnce(room)
        .mockResolvedValueOnce(room)
        .mockResolvedValueOnce(updatedRoom);

      const result = await service.kickUser(
        'test-room',
        'host-socket',
        'guest-socket',
      );

      expect(result.kickedPlayer).toEqual({
        socketId: 'guest-socket',
        nickname: 'Player-guest-socket',
      });
    });

    it('방이 없으면 에러를 던진다', async () => {
      cacheService.getRoom.mockResolvedValue(null);

      await expect(
        service.kickUser('invalid-room', 'host-socket', 'guest-socket'),
      ).rejects.toThrow(ErrorCode.ROOM_NOT_FOUND);
    });

    it('호스트가 방에 없으면 에러를 던진다', async () => {
      const room = createMockRoom({}, [guestPlayer]);
      cacheService.getRoom.mockResolvedValue(room);

      await expect(
        service.kickUser('test-room', 'unknown-socket', 'guest-socket'),
      ).rejects.toThrow(ErrorCode.PLAYER_NOT_FOUND);
    });

    it('대상 플레이어가 방에 없으면 에러를 던진다', async () => {
      const room = createMockRoom({}, [hostPlayer]);
      cacheService.getRoom.mockResolvedValue(room);

      await expect(
        service.kickUser('test-room', 'host-socket', 'unknown-socket'),
      ).rejects.toThrow(ErrorCode.PLAYER_NOT_FOUND);
    });

    it('호스트가 아니면 에러를 던진다', async () => {
      const anotherGuest = createMockPlayer('another-guest', false);
      const room = createMockRoom({}, [hostPlayer, guestPlayer, anotherGuest]);
      cacheService.getRoom.mockResolvedValue(room);

      await expect(
        service.kickUser('test-room', 'guest-socket', 'another-guest'),
      ).rejects.toThrow(ErrorCode.PLAYER_NOT_HOST);
    });

    it('WAITING 상태가 아니면 에러를 던진다', async () => {
      const room = createMockRoom({ phase: 'DRAWING' }, [
        hostPlayer,
        guestPlayer,
      ]);
      cacheService.getRoom.mockResolvedValue(room);

      await expect(
        service.kickUser('test-room', 'host-socket', 'guest-socket'),
      ).rejects.toThrow(ErrorCode.KICK_ONLY_WAITING_PHASE);
    });

    it('호스트를 강퇴하려고 하면 에러를 던진다', async () => {
      const room = createMockRoom({}, [hostPlayer, guestPlayer]);
      cacheService.getRoom.mockResolvedValue(room);

      await expect(
        service.kickUser('test-room', 'host-socket', 'host-socket'),
      ).rejects.toThrow(ErrorCode.HOST_CAN_NOT_KICKED);
    });
  });
});
