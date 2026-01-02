import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisController } from './redis.controller';
import { GameRoomCacheService } from './cache/game-room-cache.service';

@Module({
  providers: [RedisService, GameRoomCacheService],
  controllers: [RedisController],
  exports: [RedisService, GameRoomCacheService],
})
export class RedisModule {}
