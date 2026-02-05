import { Module } from '@nestjs/common';
import { ChatCacheService } from './cache/chat-cache.service';
import { GameProgressCacheService } from './cache/game-progress-cache.service';
import { GameRoomCacheService } from './cache/game-room-cache.service';
import { GracePeriodCacheService } from './cache/grace-period-cache.service';
import { LeaderboardCacheService } from './cache/leaderboard-cache.service';
import { PlayerCacheService } from './cache/player-cache.service';
import { StandingsCacheService } from './cache/standings-cache.service';
import { TimerCacheService } from './cache/timer-cache.service';
import { WaitlistCacheService } from './cache/waitlist-cache.service';
import { RedisController } from './redis.controller';
import { RedisService } from './redis.service';

@Module({
  providers: [
    RedisService,
    GameRoomCacheService,
    WaitlistCacheService,
    PlayerCacheService,
    TimerCacheService,
    LeaderboardCacheService,
    GameProgressCacheService,
    StandingsCacheService,
    ChatCacheService,
    GracePeriodCacheService,
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
    StandingsCacheService,
    ChatCacheService,
    GracePeriodCacheService,
  ],
})
export class RedisModule {}
