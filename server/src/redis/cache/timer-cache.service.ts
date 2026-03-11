import { Injectable } from '@nestjs/common';
import { RedisKeys } from '../redis-keys';
import { RedisService } from '../redis.service';

interface Timer {
  roomId: string;
  timeLeft: number;
}

interface TimerSchedule {
  roomId: string;
  timestamp: number;
}

@Injectable()
export class TimerCacheService {
  constructor(private readonly redisService: RedisService) {}

  async registerTimer(roomId: string, timeLeft: number) {
    const client = this.redisService.getClient();
    const key = RedisKeys.timer(roomId);
    const zKey = RedisKeys.timers();

    await client
      .multi()
      .hSet(key, {
        roomId,
        timeLeft,
      })
      .zAdd(zKey, { score: Date.now(), value: roomId })
      .exec();
  }

  async getTimer(roomId: string): Promise<Timer | null> {
    const client = this.redisService.getClient();
    const key = RedisKeys.timer(roomId);
    const data = await client.hGetAll(key);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return { roomId: data.roomId, timeLeft: parseInt(data.timeLeft) };
  }

  async popExpiredTimers(): Promise<TimerSchedule[]> {
    const client = this.redisService.getClient();
    const zKey = RedisKeys.timers();

    const now = Date.now();

    const [rangeResult] = await client
      .multi()
      .zRangeByScoreWithScores(zKey, 0, now)
      .zRemRangeByScore(zKey, 0, now)
      .exec<'typed'>();

    const timers = rangeResult.map((result) => ({
      roomId: result.value,
      timestamp: result.score,
    }));

    return timers;
  }

  async decrementTimer(roomId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.timer(roomId);

    const timeLeft = await client.hIncrBy(key, 'timeLeft', -1);

    if (timeLeft == -1) {
      return null;
    }
    return timeLeft;
  }

  async deleteTimer(roomId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.timer(roomId);
    const zKey = RedisKeys.timers();

    await client.multi().unlink(key).zRem(zKey, roomId).exec();
  }

  async scheduleTimer(roomId: string, timestamp: number) {
    const client = this.redisService.getClient();
    const zKey = RedisKeys.timers();

    await client.zAdd(zKey, { score: timestamp, value: roomId });
  }
}
