/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { GamePhase } from 'src/common/constants';
import { InternalError } from 'src/common/exceptions/internal-error';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';
import { GameRoom, Player } from 'src/common/types';
import { PromptService } from 'src/prompt/prompt.service';
import { RoundService } from 'src/round/round.service';
import type { CreateRoomDto } from '@shared/types';
import { GameService } from './game.service';
import { PlayerService } from './player.service';
import { RoomService } from './room.service';

describe('GameService', () => {
  let service: GameService;
  let roomService: jest.Mocked<RoomService>;
  let playerService: jest.Mocked<PlayerService>;
  let roundService: jest.Mocked<RoundService>;
  let promptService: jest.Mocked<PromptService>;

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
    phase: GamePhase.WAITING,
    currentRound: 0,
    settings: {
      drawingTime: 90,
      maxPlayer: 4,
      totalRounds: 5,
    },
    ...overrides,
  });

  beforeEach(async () => {
    const mockRoomService = {
      createRoom: jest.fn(),
      getRoom: jest.fn(),
      updateSettings: jest.fn(),
      isWaiting: jest.fn(),
    };

    const mockPlayerService = {
      getPlayers: jest.fn(),
      checkIsHost: jest.fn(),
      isRoomFull: jest.fn(),
      requestJoinWaitList: jest.fn(),
      getJoinedRoomId: jest.fn(),
      leaveRoom: jest.fn(),
      getNewlyJoinedUserFromWaitlist: jest.fn(),
    };

    const mockRoundService = {
      setPhaseChangeHandler: jest.fn(),
      nextPhase: jest.fn(),
      getRoundReplayData: jest.fn(),
      getRoundStandingData: jest.fn(),
      getGameEndData: jest.fn(),
    };

    const mockPromptService = {
      setPromptIds: jest.fn(),
      resetPromptIds: jest.fn(),
      getRandomPrompt: jest.fn(),
    };

    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: RoomService,
          useValue: mockRoomService,
        },
        {
          provide: PlayerService,
          useValue: mockPlayerService,
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
    roomService = module.get(RoomService);
    playerService = module.get(PlayerService);
    roundService = module.get(RoundService);
    promptService = module.get(PromptService);
  });

  describe('createRoom', () => {
    const createRoomDto: CreateRoomDto = {
      maxPlayer: 4,
      totalRounds: 5,
      drawingTime: 90,
    };

    it('방을 생성하고 프롬프트 ID를 설정한다', async () => {
      const roomId = 'new-room-id';
      roomService.createRoom.mockResolvedValue(roomId);

      const result = await service.createRoom(createRoomDto);

      expect(result).toBe(roomId);
      expect(roomService.createRoom).toHaveBeenCalledWith(4, 90, 5);
      expect(promptService.setPromptIds).toHaveBeenCalledWith(roomId, 5);
    });
  });

  describe('updateGameSettings', () => {
    it('호스트가 설정을 변경하면 성공한다', async () => {
      const room = createMockRoom();
      const players = [createMockPlayer('host', true)];

      roomService.getRoom.mockResolvedValue(room);
      playerService.getPlayers.mockResolvedValue(players);
      playerService.checkIsHost.mockReturnValue(true);
      roomService.updateSettings.mockResolvedValue({
        ...room,
        settings: { ...room.settings, maxPlayer: 6 },
      });

      await service.updateGameSettings('test-room', 'host', 6, 5, 90);

      expect(roomService.updateSettings).toHaveBeenCalledWith(room, 6, 90, 5);
    });

    it('호스트가 아니면 에러를 던진다', async () => {
      const room = createMockRoom();
      const players = [createMockPlayer('guest', false)];

      roomService.getRoom.mockResolvedValue(room);
      playerService.getPlayers.mockResolvedValue(players);
      playerService.checkIsHost.mockReturnValue(false);

      await expect(
        service.updateGameSettings('test-room', 'guest', 6, 5, 90),
      ).rejects.toThrow(WebsocketException);
    });

    it('WAITING 상태가 아니면 에러를 던진다', async () => {
      const room = createMockRoom({ phase: GamePhase.DRAWING });
      const players = [createMockPlayer('host', true)];

      roomService.getRoom.mockResolvedValue(room);
      playerService.getPlayers.mockResolvedValue(players);
      playerService.checkIsHost.mockReturnValue(true);

      await expect(
        service.updateGameSettings('test-room', 'host', 6, 5, 90),
      ).rejects.toThrow(WebsocketException);
    });
  });

  describe('joinRoom', () => {
    it('방이 다 찼으면 에러를 던진다', async () => {
      const room = createMockRoom();
      roomService.getRoom.mockResolvedValue(room);
      playerService.isRoomFull.mockResolvedValue(true);

      await expect(
        service.joinRoom('test-room', 'nick', 'profile', 'socket'),
      ).rejects.toThrow(WebsocketException);
    });

    it('대기열에 추가하고 업데이트된 방 정보를 반환한다', async () => {
      const room = createMockRoom();
      roomService.getRoom.mockResolvedValue(room);
      playerService.isRoomFull.mockResolvedValue(false);
      playerService.requestJoinWaitList.mockResolvedValue([]);
      roomService.getRoom.mockResolvedValue(room); // 호출 시 업데이트된 방 반환 가정

      const result = await service.joinRoom(
        'test-room',
        'nick',
        'profile',
        'socket',
      );

      expect(result.room).toEqual(room);
      expect(playerService.requestJoinWaitList).toHaveBeenCalled();
    });
  });

  describe('leaveRoom', () => {
    it('퇴장 처리 후 방 정보와 플레이어 정보를 반환한다', async () => {
      const roomId = 'test-room';
      const player = createMockPlayer('socket');
      const room = createMockRoom();

      playerService.getJoinedRoomId.mockResolvedValue(roomId);
      playerService.leaveRoom.mockResolvedValue(player);
      roomService.getRoom.mockResolvedValue(room);

      const result = await service.leaveRoom('socket');

      expect(result).toEqual({ room, player });
    });

    it('참여 중인 방이 없으면 에러를 던진다', async () => {
      playerService.getJoinedRoomId.mockResolvedValue(null);

      await expect(service.leaveRoom('socket')).rejects.toThrow(InternalError);
    });
  });

  describe('startGame', () => {
    it('호스트가 게임을 시작하면 성공한다', async () => {
      const room = createMockRoom();
      const players = [
        createMockPlayer('host', true),
        createMockPlayer('guest1', false),
      ];

      roomService.getRoom.mockResolvedValue(room);
      playerService.getPlayers.mockResolvedValue(players);
      playerService.checkIsHost.mockReturnValue(true);

      await service.startGame('test-room', 'host');

      expect(roundService.nextPhase).toHaveBeenCalledWith(room);
    });

    it('플레이어가 2명 미만이면 에러를 던진다', async () => {
      const room = createMockRoom();
      const players = [createMockPlayer('host', true)];

      roomService.getRoom.mockResolvedValue(room);
      playerService.getPlayers.mockResolvedValue(players);
      playerService.checkIsHost.mockReturnValue(true);

      await expect(service.startGame('test-room', 'host')).rejects.toThrow(
        WebsocketException,
      );
    });
  });

  describe('restartGame', () => {
    it('게임 종료 상태에서 호스트가 재시작하면 성공한다', async () => {
      const room = createMockRoom({ phase: GamePhase.GAME_END });
      const players = [createMockPlayer('host', true)];

      roomService.getRoom.mockResolvedValue(room);
      playerService.getPlayers.mockResolvedValue(players);
      playerService.checkIsHost.mockReturnValue(true);

      await service.restartGame('test-room', 'host');

      expect(roundService.nextPhase).toHaveBeenCalledWith(room);
    });

    it('게임 종료 상태가 아니면 에러를 던진다', async () => {
      const room = createMockRoom({ phase: GamePhase.WAITING });
      roomService.getRoom.mockResolvedValue(room);

      await expect(service.restartGame('test-room', 'host')).rejects.toThrow(
        WebsocketException,
      );
    });
  });

  describe('kickUser', () => {
    it('호스트가 플레이어를 강퇴하면 성공한다', async () => {
      const roomId = 'test-room';
      const hostSocketId = 'host';
      const targetSocketId = 'guest';

      roomService.isWaiting.mockResolvedValue(true);
      playerService.getPlayers.mockResolvedValue([]);
      playerService.checkIsHost.mockImplementation((_, id) => id === 'host'); // host check

      // leaveRoom 내부 모킹
      playerService.getJoinedRoomId.mockResolvedValue(roomId);
      playerService.leaveRoom.mockResolvedValue(
        createMockPlayer(targetSocketId),
      );
      roomService.getRoom.mockResolvedValue(createMockRoom());

      const result = await service.kickUser(
        roomId,
        hostSocketId,
        targetSocketId,
      );

      expect(result.kickedPlayer.socketId).toBe(targetSocketId);
    });

    it('WAITING 상태가 아니면 에러를 던진다', async () => {
      roomService.isWaiting.mockResolvedValue(false);

      await expect(service.kickUser('room', 'host', 'guest')).rejects.toThrow(
        WebsocketException,
      );
    });
  });
});
