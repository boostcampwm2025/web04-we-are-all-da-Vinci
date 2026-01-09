import { Module } from '@nestjs/common';
import { RedisModule } from 'src/redis/redis.module';
import { TimerService } from './timer.service';
import { TimerGateway } from './timer.gateway';

@Module({
  imports: [RedisModule],
  providers: [TimerService, TimerGateway],
  exports: [TimerService],
})
export class TimerModule {}
