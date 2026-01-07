import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisController } from './redis.controller';
import { GameRoomCacheService } from './cache/game-room-cache.service';
import { WaitlistCacheService } from './cache/waitlist-cache.service';
import { PlayerCacheService } from './cache/player-cache.service';

@Module({
  providers: [
    RedisService,
    GameRoomCacheService,
    WaitlistCacheService,
    PlayerCacheService,
  ],
  controllers: [RedisController],
  exports: [
    RedisService,
    GameRoomCacheService,
    WaitlistCacheService,
    PlayerCacheService,
  ],
})
export class RedisModule {}
