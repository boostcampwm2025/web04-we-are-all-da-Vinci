import { Module } from '@nestjs/common';
import { RoundService } from './round.service';
import { RedisModule } from 'src/redis/redis.module';
import { TimerModule } from 'src/timer/timer.module';
import { RoundGateway } from './round.gateway';
import { PromptModule } from 'src/prompt/prompt.module';

@Module({
  imports: [RedisModule, TimerModule, PromptModule],
  providers: [RoundService, RoundGateway],
  exports: [RoundService],
})
export class RoundModule {}
