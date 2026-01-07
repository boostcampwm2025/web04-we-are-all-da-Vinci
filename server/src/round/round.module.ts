import { Module } from '@nestjs/common';
import { RoundGateway } from './round.gateway';
import { RoundService } from './round.service';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [RoundGateway, RoundService],
  exports: [RoundGateway, RoundService],
})
export class RoundModule {}
