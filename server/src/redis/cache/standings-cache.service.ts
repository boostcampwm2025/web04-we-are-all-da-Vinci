import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis.service';

@Injectable()
export class StandingsCacheService {
  constructor(private readonly redisService: RedisService) {}

  private getKey(roomId: string) {
    return `final:${roomId}`;
  }

  async updateScore(roomId: string, socketId: string, similarity: number) {
    const client = this.redisService.getClient();
    const key = this.getKey(roomId);

    // TODO: 누적 점수 계산 로직 추가 필요
    await client.zIncrBy(key, similarity, socketId);
  }

  async getStandings(roomId: string) {
    const client = this.redisService.getClient();
    const key = this.getKey(roomId);

    const standings = await client.zRangeWithScores(key, 0, -1, { REV: true });

    return standings.map(({ value, score }) => ({
      score: score,
      socketId: value,
    }));
  }
}
