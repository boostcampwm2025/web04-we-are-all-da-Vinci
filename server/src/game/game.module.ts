import { Module } from '@nestjs/common';
import { ChatModule } from 'src/chat/chat.module';
import { PromptModule } from 'src/prompt/prompt.module';
import { RedisModule } from 'src/redis/redis.module';
import { RoundModule } from 'src/round/round.module';
import { TimerModule } from 'src/timer/timer.module';
import { GameController } from './game.controller';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';

@Module({
  imports: [RedisModule, RoundModule, TimerModule, PromptModule, ChatModule],
  controllers: [GameController],
  providers: [GameService, GameGateway],
})
export class GameModule {}
