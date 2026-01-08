import { Module } from '@nestjs/common';
import { RoundGateway } from './round.gateway';
import { RoundService } from './round.service';
import { RedisModule } from 'src/redis/redis.module';
import { TimerModule } from 'src/timer/timer.module';

@Module({
  imports: [RedisModule, TimerModule],
  providers: [RoundGateway, RoundService],
  exports: [RoundGateway, RoundService],
})
export class RoundModule {}
