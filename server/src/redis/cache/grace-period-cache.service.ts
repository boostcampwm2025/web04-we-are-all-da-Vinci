import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis.service';
import { RedisKeys } from '../redis-keys';

const GRACE_PERIOD_TTL = 2; // 2초 유예 시간

export interface GracePeriodData {
  oldSocketId: string;
  disconnectedAt: number;
}

@Injectable()
export class GracePeriodCacheService {
  constructor(private readonly redisService: RedisService) {}

  async set(
    roomId: string,
    profileId: string,
    oldSocketId: string,
  ): Promise<void> {
    const client = this.redisService.getClient();
    const key = RedisKeys.gracePeriod(roomId, profileId);

    const data: GracePeriodData = {
      oldSocketId,
      disconnectedAt: Date.now(),
    };

    await client.setEx(key, GRACE_PERIOD_TTL, JSON.stringify(data));
  }

  async get(
    roomId: string,
    profileId: string,
  ): Promise<GracePeriodData | null> {
    const client = this.redisService.getClient();
    const key = RedisKeys.gracePeriod(roomId, profileId);

    const data = await client.get(key);
    if (!data) return null;

    return JSON.parse(data) as GracePeriodData;
  }

  async exists(roomId: string, profileId: string): Promise<boolean> {
    const client = this.redisService.getClient();
    const key = RedisKeys.gracePeriod(roomId, profileId);

    return (await client.exists(key)) === 1;
  }

  async delete(roomId: string, profileId: string): Promise<void> {
    const client = this.redisService.getClient();
    const key = RedisKeys.gracePeriod(roomId, profileId);

    await client.unlink(key);
  }
}
