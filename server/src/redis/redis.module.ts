import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisController } from './redis.controller';
import { GameRoomCacheService } from './cache/game-room-cache.service';
import { RoomWaitlistService } from './cache/room-waitlist.service';
import { PlayerCacheService } from './cache/player-cache.service';

@Module({
  providers: [
    RedisService,
    GameRoomCacheService,
    RoomWaitlistService,
    PlayerCacheService,
  ],
  controllers: [RedisController],
  exports: [
    RedisService,
    GameRoomCacheService,
    RoomWaitlistService,
    PlayerCacheService,
  ],
})
export class RedisModule {}
