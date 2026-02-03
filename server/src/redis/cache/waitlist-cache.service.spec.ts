import { Test, TestingModule } from '@nestjs/testing';
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
  };

  const mockRedisService = {
    getClient: jest.fn().mockReturnValue(mockRedisClient),
  };

  const createPlayer = (profileId: string): Player => ({
    socketId: `socket-${profileId}`,
    nickname: `nickname-${profileId}`,
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
  });
});
