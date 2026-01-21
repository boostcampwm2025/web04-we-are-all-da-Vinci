import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { RedisModule } from 'src/redis/redis.module';
import { RoundModule } from 'src/round/round.module';
import { TimerModule } from 'src/timer/timer.module';
import { PromptModule } from 'src/prompt/prompt.module';

@Module({
  imports: [RedisModule, RoundModule, TimerModule, PromptModule],
  controllers: [GameController],
  providers: [GameService, GameGateway],
})
export class GameModule {}
