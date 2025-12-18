import { Test, TestingModule } from '@nestjs/testing';
import { GamePlayService } from './game-play.service';

describe('GamePlayService', () => {
  let service: GamePlayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GamePlayService],
    }).compile();

    service = module.get<GamePlayService>(GamePlayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
