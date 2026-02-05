import { Injectable } from '@nestjs/common';
import { REDIS_TTL } from '../../common/constants';
import { RedisKeys } from '../redis-keys';
import { RedisService } from '../redis.service';

@Injectable()
export class LeaderboardCacheService {
  constructor(private readonly redisService: RedisService) {}

  async initRanking(roomId: string, profileIds: string[]) {
    const client = this.redisService.getClient();
    const key = RedisKeys.leaderboard(roomId);
    const members = profileIds.map((id) => ({ score: 0, value: id }));

    await client.zAdd(key, members);

    await client.expire(key, REDIS_TTL);
  }

  async updateScore(roomId: string, profileId: string, similarity: number) {
    const client = this.redisService.getClient();
    const key = RedisKeys.leaderboard(roomId);

    await client.zAdd(key, { score: similarity, value: profileId });
  }

  async getAll(roomId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.leaderboard(roomId);

    return await client.zRangeWithScores(key, 0, -1, { REV: true });
  }

  async delete(roomId: string, profileId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.leaderboard(roomId);

    await client.zRem(key, profileId);
  }

  async deleteAll(roomId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.leaderboard(roomId);

    await client.unlink(key);
  }
}
