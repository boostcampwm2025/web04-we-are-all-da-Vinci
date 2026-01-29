import { Injectable } from '@nestjs/common';
import { RedisKeys } from '../redis-keys';
import { RedisService } from '../redis.service';

interface Timer {
  roomId: string;
  timeLeft: number;
}

@Injectable()
export class TimerCacheService {
  constructor(private readonly redisService: RedisService) {}

  async addTimer(roomId: string, timeLeft: number) {
    const client = this.redisService.getClient();
    const key = RedisKeys.timer(roomId);
    await client.hSet(key, {
      roomId,
      timeLeft,
    });
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

  async getAllTimers(): Promise<Timer[]> {
    const client = this.redisService.getClient();
    const timers = [];

    // Use SCAN instead of KEYS to avoid blocking Redis
    let cursor = '0';
    do {
      const result = await client.scan(cursor, {
        MATCH: 'timer:*',
        COUNT: 100,
      });
      cursor = result.cursor;

      for (const key of result.keys) {
        const data = await client.hGetAll(key);
        if (data && Object.keys(data).length > 0) {
          timers.push({
            roomId: data.roomId,
            timeLeft: parseInt(data.timeLeft),
          });
        }
      }
    } while (cursor !== '0');

    return timers;
  }

  async decrementTimer(roomId: string) {
    const timer = await this.getTimer(roomId);
    if (!timer) return null;
    const updatedTimeLeft = timer.timeLeft - 1;
    if (updatedTimeLeft <= 0) {
      await this.deleteTimer(roomId);
      return 0;
    }

    await this.addTimer(roomId, updatedTimeLeft);
    return updatedTimeLeft;
  }

  async deleteTimer(roomId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.timer(roomId);
    await client.del(key);
  }
}
