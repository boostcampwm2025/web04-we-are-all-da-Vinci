import { Injectable } from '@nestjs/common';
import { Similarity } from 'src/common/types';
import { RedisKeys } from '../redis-keys';
import { RedisService } from '../redis.service';

@Injectable()
export class StandingsCacheService {
  constructor(private readonly redisService: RedisService) {}

  async updateScore(roomId: string, profileId: string, similarity: Similarity) {
    const client = this.redisService.getClient();
    const key = RedisKeys.standings(roomId);

    await client.zIncrBy(key, similarity.similarity, profileId);
  }

  async getStandings(roomId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.standings(roomId);

    const standings = await client.zRangeWithScores(key, 0, -1, { REV: true });

    return standings.map(({ value, score }) => ({
      score: score,
      profileId: value,
    }));
  }

  async delete(roomId: string, profileId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.standings(roomId);

    await client.zRem(key, profileId);
  }

  async deleteAll(roomId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.standings(roomId);

    await client.unlink(key);
  }
}
