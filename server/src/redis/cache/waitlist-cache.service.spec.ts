import { Test, TestingModule } from '@nestjs/testing';
import { REDIS_TTL } from 'src/common/constants';
import { Player } from 'src/common/types';
import { RedisService } from '../redis.service';
import { WaitlistCacheService } from './waitlist-cache.service';

describe('WaitlistCacheService', () => {
  let service: WaitlistCacheService;

  const mockRedisClient = {
    rPush: jest.fn(),
    lPop: jest.fn(),
    lRem: jest.fn(),
    lRange: jest.fn(),
    lLen: jest.fn(),
    expire: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn().mockReturnValue(mockRedisClient),
  };

  const createPlayer = (profileId: string): Player => ({
    socketId: `socket-${profileId}`,
    nickname: `user`,
    profileId,
    isHost: false,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaitlistCacheService,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<WaitlistCacheService>(WaitlistCacheService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addWaitPlayer', () => {
    const roomId = 'test-room-id';

    it('플레이어를 대기열에 추가하고 TTL을 설정해야 한다', async () => {
      // Arrange
      const player = createPlayer('profile-123');
      mockRedisClient.rPush.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      // Act
      const result = await service.addWaitPlayer(roomId, player);

      // Assert
      expect(result).toBe(1);
      expect(mockRedisClient.rPush).toHaveBeenCalledWith(
        `waiting:${roomId}`,
        JSON.stringify(player),
      );
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        `waiting:${roomId}`,
        REDIS_TTL,
      );
    });
  });

  describe('hasProfile', () => {
    const roomId = 'test-room-id';

    it('대기열에 해당 profileId가 존재하는 경우 true를 반환해야 한다', async () => {
      // Arrange
      const targetProfileId = 'profile-123';
      const waitlistPlayers = [
        createPlayer('profile-001'),
        createPlayer(targetProfileId),
        createPlayer('profile-456'),
      ];
      mockRedisClient.lRange.mockResolvedValue(
        waitlistPlayers.map((p) => JSON.stringify(p)),
      );

      // Act
      const result = await service.hasProfile(roomId, targetProfileId);

      // Assert
      expect(result).toBe(true);
      expect(mockRedisClient.lRange).toHaveBeenCalled();
    });

    it('대기열에 해당 profileId가 존재하지 않는 경우 false를 반환해야 한다', async () => {
      // Arrange
      const targetProfileId = 'non-existent-profile';
      const waitlistPlayers = [
        createPlayer('profile-001'),
        createPlayer('profile-002'),
        createPlayer('profile-003'),
      ];
      mockRedisClient.lRange.mockResolvedValue(
        waitlistPlayers.map((p) => JSON.stringify(p)),
      );

      // Act
      const result = await service.hasProfile(roomId, targetProfileId);

      // Assert
      expect(result).toBe(false);
      expect(mockRedisClient.lRange).toHaveBeenCalled();
    });

    it('빈 대기열인 경우 false를 반환해야 한다', async () => {
      // Arrange
      const targetProfileId = 'any-profile';
      mockRedisClient.lRange.mockResolvedValue([]);

      // Act
      const result = await service.hasProfile(roomId, targetProfileId);

      // Assert
      expect(result).toBe(false);
      expect(mockRedisClient.lRange).toHaveBeenCalled();
    });

    it('excludeSocketId로 자신의 소켓을 제외하면 false를 반환해야 한다', async () => {
      // Arrange
      const targetProfileId = 'profile-123';
      const targetSocketId = `socket-${targetProfileId}`;
      const waitlistPlayers = [createPlayer(targetProfileId)];
      mockRedisClient.lRange.mockResolvedValue(
        waitlistPlayers.map((p) => JSON.stringify(p)),
      );

      // Act
      const result = await service.hasProfile(
        roomId,
        targetProfileId,
        targetSocketId,
      );

      // Assert
      expect(result).toBe(false);
    });

    it('excludeSocketId로 자신의 소켓을 제외해도 다른 사용자의 동일 profileId가 있으면 true를 반환해야 한다', async () => {
      // Arrange
      const targetProfileId = 'profile-123';
      const mySocketId = 'my-socket-id';
      const waitlistPlayers = [
        { ...createPlayer(targetProfileId), socketId: 'other-socket-id' },
      ];
      mockRedisClient.lRange.mockResolvedValue(
        waitlistPlayers.map((p) => JSON.stringify(p)),
      );

      // Act
      const result = await service.hasProfile(
        roomId,
        targetProfileId,
        mySocketId,
      );

      // Assert
      expect(result).toBe(true);
    });
  });
});
