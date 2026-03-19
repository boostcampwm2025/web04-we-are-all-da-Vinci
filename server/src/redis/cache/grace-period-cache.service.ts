import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis.service';
import { RedisKeys } from '../redis-keys';

const GRACE_PERIOD_TTL = 2; // 2초 유예 시간

export interface GracePeriodData {
  roomId: string;
  profileId: string;
  socketId: string;
  nickname: string;
}

@Injectable()
export class GracePeriodCacheService {
  constructor(private readonly redisService: RedisService) {}

  async set(
    roomId: string,
    profileId: string,
    socketId: string,
    nickname: string,
  ): Promise<void> {
    const client = this.redisService.getClient();
    const key = RedisKeys.gracePeriod();

    const data: GracePeriodData = {
      roomId,
      profileId,
      socketId,
      nickname,
    };

    await client.zAdd(key, {
      score: Date.now() + GRACE_PERIOD_TTL * 1000,
      value: JSON.stringify(data),
    });
  }

  async exists(
    roomId: string,
    profileId: string,
    socketId: string,
    nickname: string,
  ): Promise<boolean> {
    const client = this.redisService.getClient();
    const key = RedisKeys.gracePeriod();
    const data = JSON.stringify({ roomId, profileId, socketId, nickname });

    return (await client.zScore(key, data)) !== null;
  }

  async delete(
    roomId: string,
    profileId: string,
    socketId: string,
    nickname: string,
  ): Promise<void> {
    const client = this.redisService.getClient();
    const key = RedisKeys.gracePeriod();
    const data = JSON.stringify({ roomId, profileId, socketId, nickname });

    await client.zRem(key, data);
  }

  async popUntil(time: number): Promise<GracePeriodData[]> {
    const client = this.redisService.getClient();
    const key = RedisKeys.gracePeriod();

    const [rangeResult] = await client
      .multi()
      .zRangeByScore(key, 0, time)
      .zRemRangeByScore(key, 0, time)
      .exec<'typed'>();

    return rangeResult.map((result) => JSON.parse(result) as GracePeriodData);
  }
}
