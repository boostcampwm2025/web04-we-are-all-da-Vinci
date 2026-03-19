/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { HealthService } from './health.service';
import { RedisService } from 'src/redis/redis.service';
import { PromptService } from 'src/prompt/prompt.service';
import { PinoLogger } from 'nestjs-pino';

describe('HealthService', () => {
  let service: HealthService;
  let redisService: jest.Mocked<RedisService>;
  let promptService: jest.Mocked<PromptService>;

  const mockRedisClient = {
    ping: jest.fn(),
  };

  beforeEach(async () => {
    const mockRedisService = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
    };

    const mockPromptService = {
      checkPrompts: jest.fn(),
    };

    const mockLogger = {
      setContext: jest.fn(),
      info: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: PromptService, useValue: mockPromptService },
        { provide: PinoLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    redisService = module.get(RedisService);
    promptService = module.get(PromptService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('check', () => {
    it('모든 서비스가 준비되면 ok를 응답한다.', async () => {
      // given
      mockRedisClient.ping.mockResolvedValue('PONG');
      promptService.checkPrompts.mockResolvedValue(true);

      // when
      const result = await service.check();

      // then
      expect(result.status).toBe('ok');
      expect(result.info).toEqual([
        { name: 'redis', status: 'up' },
        { name: 'prompts', status: 'up' },
      ]);
    });

    it('레디스 서비스가 준비되지 않으면 에러를 반환한다.', async () => {
      // given
      mockRedisClient.ping.mockRejectedValue(new Error('Redis is not ready'));
      promptService.checkPrompts.mockResolvedValue(true);

      // when
      const result = await service.check();

      // then
      expect(result.status).toBe('error');
      expect(result.info).toEqual([
        { name: 'redis', status: 'down', message: 'Redis is not ready' },
        { name: 'prompts', status: 'up' },
      ]);
    });

    it('프롬프트 서비스가 준비되지 않으면 에러를 반환한다.', async () => {
      // given
      mockRedisClient.ping.mockResolvedValue('PONG');
      promptService.checkPrompts.mockRejectedValue(
        new Error('Prompt file not found'),
      );

      // when
      const result = await service.check();

      // then
      expect(result.status).toBe('error');
      expect(result.info).toEqual([
        { name: 'redis', status: 'up' },
        { name: 'prompts', status: 'down', message: 'Prompt file not found' },
      ]);
    });

    it('모든 서비스가 준비되지 않으면 에러를 반환한다.', async () => {
      // given
      mockRedisClient.ping.mockRejectedValue(new Error('Connection refused'));
      promptService.checkPrompts.mockRejectedValue(
        new Error('Prompt file not found'),
      );

      // when
      const result = await service.check();

      // then
      expect(result.status).toBe('error');
      expect(result.info).toEqual([
        { name: 'redis', status: 'down', message: 'Connection refused' },
        { name: 'prompts', status: 'down', message: 'Prompt file not found' },
      ]);
    });

    it('레디스가 PONG이 아닌 값을 반환하면 down 상태이다.', async () => {
      // given
      mockRedisClient.ping.mockResolvedValue('SOMETHING_ELSE');
      promptService.checkPrompts.mockResolvedValue(true);

      // when
      const result = await service.check();

      // then
      expect(result.status).toBe('error');
      expect(result.info).toEqual([
        { name: 'redis', status: 'down' },
        { name: 'prompts', status: 'up' },
      ]);
    });

    it('프롬프트가 비어있으면 down 상태이다.', async () => {
      // given
      mockRedisClient.ping.mockResolvedValue('PONG');
      promptService.checkPrompts.mockResolvedValue(false);

      // when
      const result = await service.check();

      // then
      expect(result.status).toBe('error');
      expect(result.info).toEqual([
        { name: 'redis', status: 'up' },
        { name: 'prompts', status: 'down' },
      ]);
    });

    it('Error가 아닌 예외가 발생하면 Unknown error 메시지를 반환한다.', async () => {
      // given
      mockRedisClient.ping.mockRejectedValue('string error');
      promptService.checkPrompts.mockRejectedValue(42);

      // when
      const result = await service.check();

      // then
      expect(result.status).toBe('error');
      expect(result.info).toEqual([
        { name: 'redis', status: 'down', message: 'Unknown error' },
        { name: 'prompts', status: 'down', message: 'Unknown error' },
      ]);
    });
  });
});
