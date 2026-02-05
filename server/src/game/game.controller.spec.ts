/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import type { CreateRoomDto } from '@shared/types';
import { GameController } from './game.controller';
import { GameService } from './game.service';

describe('GameController', () => {
  let controller: GameController;
  let service: jest.Mocked<GameService>;
  let logger: jest.Mocked<PinoLogger>;

  beforeEach(async () => {
    const mockService = {
      createRoom: jest.fn(),
    };

    const mockLogger = {
      setContext: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GameController],
      providers: [
        {
          provide: GameService,
          useValue: mockService,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    controller = module.get<GameController>(GameController);
    service = module.get(GameService);
    logger = module.get(PinoLogger);
  });

  describe('방 생성', () => {
    const createRoomDto: CreateRoomDto = {
      maxPlayer: 4,
      totalRounds: 5,
      drawingTime: 90,
    };

    it('방을 생성하고 roomId를 반환한다', async () => {
      const mockRoomId = 'abc12345';
      service.createRoom.mockResolvedValue(mockRoomId);

      const result = await controller.createRoom(createRoomDto);

      expect(result).toEqual({ roomId: mockRoomId });
      expect(service.createRoom).toHaveBeenCalledWith(createRoomDto);
    });

    it('방 생성 시 설정과 함께 로그를 남긴다', async () => {
      const mockRoomId = 'xyz98765';
      service.createRoom.mockResolvedValue(mockRoomId);

      await controller.createRoom(createRoomDto);

      expect(logger.info).toHaveBeenCalledWith(
        { roomId: mockRoomId, settings: createRoomDto },
        'New Room Created',
      );
    });

    it('다양한 방 설정을 처리한다', async () => {
      const customDto: CreateRoomDto = {
        maxPlayer: 6,
        totalRounds: 10,
        drawingTime: 120,
      };
      const mockRoomId = 'def45678';
      service.createRoom.mockResolvedValue(mockRoomId);

      const result = await controller.createRoom(customDto);

      expect(result).toEqual({ roomId: mockRoomId });
      expect(service.createRoom).toHaveBeenCalledWith(customDto);
      expect(logger.info).toHaveBeenCalledWith(
        { roomId: mockRoomId, settings: customDto },
        'New Room Created',
      );
    });
  });
});
