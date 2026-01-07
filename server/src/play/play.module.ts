import { Module } from '@nestjs/common';
import { PlayGateway } from './play.gateway';
import { PlayService } from './play.service';

@Module({
  providers: [PlayGateway, PlayService],
  imports: [RedisModule],
})
export class PlayModule {}
