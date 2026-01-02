import { Module } from '@nestjs/common';
import { GamePlayGateway } from './game-play.gateway';
import { GamePlayService } from './game-play.service';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [GamePlayGateway, GamePlayService],
})
export class GamePlayModule {}
