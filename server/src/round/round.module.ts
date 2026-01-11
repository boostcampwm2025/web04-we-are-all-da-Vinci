import { Module } from '@nestjs/common';
import { RoundService } from './round.service';
import { RedisModule } from 'src/redis/redis.module';
import { TimerModule } from 'src/timer/timer.module';

@Module({
  imports: [RedisModule, TimerModule],
  providers: [RoundService],
  exports: [RoundService],
})
export class RoundModule {}
