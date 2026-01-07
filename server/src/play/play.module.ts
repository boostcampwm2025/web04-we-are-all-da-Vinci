import { Module } from '@nestjs/common';
import { PlayGateway } from './play.gateway';
import { PlayService } from './play.service';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  providers: [PlayGateway, PlayService],
  imports: [RedisModule],
})
export class PlayModule {}
