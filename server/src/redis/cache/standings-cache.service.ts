import { Injectable } from '@nestjs/common';
import { Similarity } from 'src/common/types';
import { RedisKeys } from '../redis-keys';
import { RedisService } from '../redis.service';

@Injectable()
export class StandingsCacheService {
  constructor(private readonly redisService: RedisService) {}

  async updateScore(roomId: string, socketId: string, similarity: Similarity) {
    const client = this.redisService.getClient();
    const key = RedisKeys.standings(roomId);

    // TODO: 누적 점수 계산 로직 추가 필요
    await client.zIncrBy(key, similarity.similarity, socketId);
  }

  async getStandings(roomId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.standings(roomId);

    const standings = await client.zRangeWithScores(key, 0, -1, { REV: true });

    return standings.map(({ value, score }) => ({
      score: score,
      socketId: value,
    }));
  }

  async deleteAll(roomId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.standings(roomId);

    await client.unlink(key);
  }
}
