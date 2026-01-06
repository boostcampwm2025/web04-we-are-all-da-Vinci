import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisController } from './redis.controller';
import { GameRoomCacheService } from './cache/game-room-cache.service';
import { RoomWaitlistService } from './cache/room-waitlist.service';

@Module({
  providers: [RedisService, GameRoomCacheService, RoomWaitlistService],
  controllers: [RedisController],
  exports: [RedisService, GameRoomCacheService, RoomWaitlistService],
})
export class RedisModule {}
