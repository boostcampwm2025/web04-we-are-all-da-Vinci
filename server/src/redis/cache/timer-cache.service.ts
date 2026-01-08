import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis.service';

interface Timer {
  roomId: string;
  timeLeft: number;
}

@Injectable()
export class TimerCacheService {
  constructor(private readonly redisService: RedisService) {}

  private getKey(roomId: string) {
    return `timer:${roomId}`;
  }

  async addTimer(roomId: string, timeLeft: number) {
    const client = this.redisService.getClient();
    const key = this.getKey(roomId);
    await client.hSet(key, {
      roomId,
      timeLeft,
    });
  }

  async getTimer(roomId: string): Promise<Timer | null> {
    const client = this.redisService.getClient();
    const key = this.getKey(roomId);
    const data = await client.hGetAll(key);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return { roomId: data.roomId, timeLeft: parseInt(data.timeLeft) };
  }

  async getAllTimers(): Promise<Timer[]> {
    const client = this.redisService.getClient();
    const keys = await client.keys('timer:*');
    if (keys.length === 0) return [];

    const timers = [];
    for (const key of keys) {
      const data = await client.hGetAll(key);
      if (data && Object.keys(data).length > 0) {
        timers.push({
          roomId: data.roomId,
          timeLeft: parseInt(data.timeLeft),
        });
      }
    }

    return timers;
  }

  async deleteTimer(roomId: string) {
    const client = this.redisService.getClient();
    const key = this.getKey(roomId);
    await client.del(key);
  }
}
