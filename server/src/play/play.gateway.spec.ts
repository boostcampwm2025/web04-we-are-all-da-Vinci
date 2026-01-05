import { Test, TestingModule } from '@nestjs/testing';
import { PlayGateway } from './play.gateway';

describe('PlayGateway', () => {
  let gateway: PlayGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlayGateway],
    }).compile();

    gateway = module.get<PlayGateway>(PlayGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
