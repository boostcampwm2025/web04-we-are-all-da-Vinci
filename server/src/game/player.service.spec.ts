/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { PlayerService } from './player.service';
import { WaitlistCacheService } from 'src/redis/cache/waitlist-cache.service';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { PlayerCacheService } from 'src/redis/cache/player-cache.service';
import { LeaderboardCacheService } from 'src/redis/cache/leaderboard-cache.service';
import { GameProgressCacheService } from 'src/redis/cache/game-progress-cache.service';
import { GamePhase } from 'src/common/constants';
import { StandingsCacheService } from 'src/redis/cache/standings-cache.service';

describe('PlayerService', () => {
  let service: PlayerService;

  let waitlistCache: jest.Mocked<WaitlistCacheService>;
  let gameRoomCache: jest.Mocked<GameRoomCacheService>;
  let playerCache: jest.Mocked<PlayerCacheService>;
  let leaderboardCache: jest.Mocked<LeaderboardCacheService>;
  let progressCache: jest.Mocked<GameProgressCacheService>;
  let standingCache: jest.Mocked<StandingsCacheService>;

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
    const mockWaitlistCache = {
      addWaitPlayer: jest.fn(),
      deleteWaitPlayer: jest.fn(),
      getWaitlistSize: jest.fn(),
    };
    const mockGameRoomCache = {
      getRoom: jest.fn(),
      popAndAddPlayerAtomically: jest.fn(),
      getAllPlayers: jest.fn(),
      deletePlayer: jest.fn(),
    };
    const mockPlayerCache = {
      set: jest.fn(),
      delete: jest.fn(),
      getRoomId: jest.fn(),
    };
    const mockLeaderboardCache = {
      updateScore: jest.fn(),
      delete: jest.fn(),
    };
    const mockProgressCache = {
      deletePlayer: jest.fn(),
    };
    const mockStandingCache = {
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerService,
        {
          provide: WaitlistCacheService,
          useValue: mockWaitlistCache,
        },
        {
          provide: GameRoomCacheService,
          useValue: mockGameRoomCache,
        },
        {
          provide: PlayerCacheService,
          useValue: mockPlayerCache,
        },
        {
          provide: LeaderboardCacheService,
          useValue: mockLeaderboardCache,
        },
        {
          provide: GameProgressCacheService,
          useValue: mockProgressCache,
        },
        {
          provide: StandingsCacheService,
          useValue: mockStandingCache,
        },
      ],
    }).compile();

    service = module.get<PlayerService>(PlayerService);
    waitlistCache = module.get(WaitlistCacheService);
    gameRoomCache = module.get(GameRoomCacheService);
    playerCache = module.get(PlayerCacheService);
    leaderboardCache = module.get(LeaderboardCacheService);
    progressCache = module.get(GameProgressCacheService);
    standingCache = module.get(StandingsCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestJoinWaitList', () => {
    it('대기 리스트에 추가하면, 게임에 새로 참가할 플레이어를 리턴한다.', async () => {
      // given
      const player = mockPlayers[0];
      const room = mockBaseRoom;
      const roomId = room.roomId;

      const { socketId, profileId, nickname } = player;

      waitlistCache.addWaitPlayer.mockResolvedValue(1);
      gameRoomCache.getRoom.mockResolvedValue({ ...room, players: [] });
      gameRoomCache.popAndAddPlayerAtomically
        .mockResolvedValueOnce(player)
        .mockResolvedValueOnce(null);

      // when
      const result = await service.requestJoinWaitList(
        roomId,
        socketId,
        profileId,
        nickname,
      );

      // then
      expect(result.length).toEqual(1);
      expect(result[0].socketId).toEqual(player.socketId);
      expect(leaderboardCache.updateScore).toHaveBeenCalledWith(
        roomId,
        socketId,
        0,
      );
      expect(playerCache.set).toHaveBeenCalledWith(socketId, roomId);
    });
    it('현재 그림 제시 단계면, 플레이어를 리턴하지 않는다.', async () => {
      // given
      const player = mockPlayers[1];
      const room = mockBaseRoom;
      const roomId = room.roomId;

      const { socketId, profileId, nickname } = player;

      waitlistCache.addWaitPlayer.mockResolvedValue(1);
      gameRoomCache.getRoom.mockResolvedValue({
        ...room,
        players: [mockPlayers[0]],
        phase: GamePhase.PROMPT,
      });
      gameRoomCache.popAndAddPlayerAtomically.mockResolvedValue(player);

      // when
      const result = await service.requestJoinWaitList(
        roomId,
        socketId,
        profileId,
        nickname,
      );

      // then
      expect(result.length).toEqual(0);
    });

    it('현재 그림 그리기 단계면, 플레이어를 리턴하지 않는다.', async () => {
      // given
      const player = mockPlayers[1];
      const room = mockBaseRoom;
      const roomId = room.roomId;

      const { socketId, profileId, nickname } = player;

      waitlistCache.addWaitPlayer.mockResolvedValue(1);
      gameRoomCache.getRoom.mockResolvedValue({
        ...room,
        players: [mockPlayers[0]],
        phase: GamePhase.DRAWING,
      });
      gameRoomCache.popAndAddPlayerAtomically.mockResolvedValue(player);

      // when
      const result = await service.requestJoinWaitList(
        roomId,
        socketId,
        profileId,
        nickname,
      );

      // then
      expect(result.length).toEqual(0);
    });
  });

  describe('leaveRoom', () => {
    it('플레이어가 퇴장하면, 플레이어 데이터를 삭제한다.', async () => {
      // given
      const player = mockPlayers[1];
      const room = mockBaseRoom;
      const roomId = room.roomId;

      const { socketId } = player;

      gameRoomCache.getAllPlayers.mockResolvedValue(mockPlayers);

      playerCache.delete.mockResolvedValue(roomId);
      gameRoomCache.deletePlayer.mockResolvedValue(true);

      // when
      await service.leaveRoom(roomId, socketId);

      // then
      expect(playerCache.delete).toHaveBeenCalledWith(socketId);
      expect(gameRoomCache.deletePlayer).toHaveBeenCalledWith(roomId, socketId);
      expect(leaderboardCache.delete).toHaveBeenCalledWith(roomId, socketId);
      expect(progressCache.deletePlayer).toHaveBeenCalledWith(roomId, socketId);
      expect(standingCache.delete).toHaveBeenCalledWith(roomId, socketId);
    });

    it('대기 중인 플레이어가 퇴장하면, 대기열에서만 삭제한다.', async () => {
      // given
      const player = {
        socketId: 'waiting1',
        profileId: 'waiting1',
        nickname: 'waiting1',
        isHost: false,
      };
      const room = mockBaseRoom;
      const roomId = room.roomId;

      const { socketId } = player;

      gameRoomCache.getAllPlayers.mockResolvedValue(mockPlayers);
      playerCache.delete.mockResolvedValue(roomId);

      // when
      await service.leaveRoom(roomId, socketId);

      // then
      expect(playerCache.delete).toHaveBeenCalledWith(socketId);
      expect(waitlistCache.deleteWaitPlayer).toHaveBeenCalledWith(
        roomId,
        socketId,
      );
    });
  });

  describe('checkIsHost', () => {
    it('플레이어가 방장이 아니면, false를 리턴한다.', () => {
      // given
      const player = mockPlayers[1];

      const players = mockPlayers;

      const { socketId } = player;

      // when
      const result = service.checkIsHost(players, socketId);

      // then
      expect(result).toEqual(false);
    });

    it('플레이어가 방장이면, true를 리턴한다.', () => {
      // given
      const player = mockPlayers[0];

      const players = mockPlayers;

      const { socketId } = player;

      // when
      const result = service.checkIsHost(players, socketId);

      // then
      expect(result).toEqual(true);
    });
  });

  describe('isHost', () => {
    it('플레이어가 방장이 아니면, false를 리턴한다.', async () => {
      // given
      const player = mockPlayers[1];
      const room = mockBaseRoom;
      const roomId = room.roomId;

      const { socketId } = player;

      gameRoomCache.getAllPlayers.mockResolvedValue(mockPlayers);

      // when
      const result = await service.isHost(roomId, socketId);

      // then
      expect(result).toEqual(false);
    });

    it('플레이어가 방장이면, true를 리턴한다.', async () => {
      // given
      const player = mockPlayers[0];
      const room = mockBaseRoom;
      const roomId = room.roomId;

      const { socketId } = player;

      gameRoomCache.getAllPlayers.mockResolvedValue(mockPlayers);

      // when
      const result = await service.isHost(roomId, socketId);

      // then
      expect(result).toEqual(true);
    });
  });
});
