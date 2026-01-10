import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisController } from './redis.controller';
import { GameRoomCacheService } from './cache/game-room-cache.service';
import { WaitlistCacheService } from './cache/waitlist-cache.service';
import { PlayerCacheService } from './cache/player-cache.service';
import { TimerCacheService } from './cache/timer-cache.service';
import { LeaderboardCacheService } from './cache/leaderboard-cache.service';
import { GameProgressCacheService } from './cache/game-progress-cache.service';

@Module({
  providers: [
    RedisService,
    GameRoomCacheService,
    WaitlistCacheService,
    PlayerCacheService,
    TimerCacheService,
    LeaderboardCacheService,
    GameProgressCacheService,
  ],
  controllers: [RedisController],
  exports: [
    RedisService,
    GameRoomCacheService,
    WaitlistCacheService,
    PlayerCacheService,
    TimerCacheService,
    LeaderboardCacheService,
    GameProgressCacheService,
  ],
})
export class RedisModule {}
