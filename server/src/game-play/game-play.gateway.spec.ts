import { Test, TestingModule } from '@nestjs/testing';
import { GamePlayGateway } from './game-play.gateway';

describe('GamePlayGateway', () => {
  let gateway: GamePlayGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GamePlayGateway],
    }).compile();

    gateway = module.get<GamePlayGateway>(GamePlayGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
