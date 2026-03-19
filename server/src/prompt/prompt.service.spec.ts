/* eslint-disable @typescript-eslint/unbound-method  */

import { Test, TestingModule } from '@nestjs/testing';
import { PromptService } from './prompt.service';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { PinoLogger } from 'nestjs-pino';

const mockPromptStrokes = [
  [
    {
      points: [
        [186, 242, 249, 250],
        [74, 71, 73, 77],
      ],
      color: [0, 0, 0],
    },
  ],
  [
    {
      points: [
        [186, 242, 249, 250],
        [74, 71, 73, 77],
      ],
      color: [0, 0, 0],
    },
  ],
  [
    {
      points: [
        [186, 242, 249, 250],
        [74, 71, 73, 77],
      ],
      color: [0, 0, 0],
    },
  ],
];

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn(),
}));

import { readFile } from 'fs/promises';
import { join } from 'path';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';
import { BadRequestException } from '@nestjs/common';

describe('PromptService', () => {
  let service: PromptService;
  let cacheService: jest.Mocked<GameRoomCacheService>;

  const mockCacheService = {
    getPromptId: jest.fn(),
    resetPromptIds: jest.fn(),
    addPromptIds: jest.fn(),
  };

  const mockLogger = {
    info: jest.fn(),
    setContext: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    (readFile as jest.Mock).mockResolvedValue(
      JSON.stringify(mockPromptStrokes),
    );
    (join as jest.Mock).mockReturnValue('mock/path');
    mockCacheService.getPromptId.mockResolvedValue(0);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptService,
        {
          provide: GameRoomCacheService,
          useValue: mockCacheService,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<PromptService>(PromptService);
    cacheService = module.get(GameRoomCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPromptForRound', () => {
    it('라운드에 맞는 프롬프트를 반환한다', async () => {
      // given
      const round = 1;
      const roomId = 'testRoomId';

      // when
      const result = await service.getPromptForRound(roomId, round);

      // then
      expect(result).toEqual(mockPromptStrokes[round - 1]);
    });

    it('라운드에 맞는 프롬프트가 없을 경우 에러를 반환한다', async () => {
      // given
      const round = 4;
      const roomId = 'testRoomId';

      cacheService.getPromptId.mockResolvedValue(null);
      // when & then
      await expect(service.getPromptForRound(roomId, round)).rejects.toThrow(
        WebsocketException,
      );
    });
  });

  describe('setPromptIds', () => {
    it('랜덤한 프롬프트 인덱스를 생성해서 저장한다.', async () => {
      // given
      const roomId = 'testRoomId';
      const totalRounds = 3;

      // when
      const result = await service.setPromptIds(roomId, totalRounds);

      // then
      expect(result).toHaveLength(totalRounds);
      expect(cacheService.addPromptIds).toHaveBeenCalledWith(roomId, ...result);
    });

    it('프롬프트 개수가 라운드 개수보다 적으면 에러를 반환한다.', async () => {
      // given
      const roomId = 'testRoomId';
      const totalRounds = 4;

      // when & then
      await expect(service.setPromptIds(roomId, totalRounds)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resetPromptIds', () => {
    it('랜덤한 프롬프트 인덱스를 생성해서 저장한다.', async () => {
      // given
      const roomId = 'testRoomId';
      const totalRounds = 3;

      // when
      const result = await service.resetPromptIds(roomId, totalRounds);

      // then
      expect(result).toHaveLength(totalRounds);
      expect(cacheService.resetPromptIds).toHaveBeenCalledWith(
        roomId,
        ...result,
      );
    });

    it('프롬프트 개수가 라운드 개수보다 적으면 에러를 반환한다.', async () => {
      // given
      const roomId = 'testRoomId';
      const totalRounds = 4;

      // when & then
      await expect(service.resetPromptIds(roomId, totalRounds)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getRandomPrompt', () => {
    it('랜덤한 프롬프트를 반환한다.', async () => {
      // when
      const result = await service.getRandomPrompt();

      // then
      expect(result).toHaveLength(1);
    });
  });
});
