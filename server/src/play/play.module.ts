import { Module } from '@nestjs/common';
import { PlayGateway } from './play.gateway';
import { PlayService } from './play.service';
import { RedisModule } from 'src/redis/redis.module';
import { RoundModule } from 'src/round/round.module';

@Module({
  providers: [PlayGateway, PlayService],
  imports: [RedisModule, RoundModule],
})
export class PlayModule {}
