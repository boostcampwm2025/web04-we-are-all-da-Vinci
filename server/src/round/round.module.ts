import { Module } from '@nestjs/common';
import { RoundService } from './round.service';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  providers: [RoundService],
  imports: [RedisModule],
  exports: [RoundService],
})
export class RoundModule {}
