import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis.service';

@Injectable()
export class LeaderboardCacheService {
  constructor(private readonly redisService: RedisService) {}

  private getKey(roomId: string) {
    return `leaderboard:${roomId}`;
  }

  async updateScore(roomId: string, socketId: string, similarity: number) {
    const client = this.redisService.getClient();
    const key = this.getKey(roomId);

    await client.zAdd(key, { score: similarity, value: socketId });
  }

  async getAll(roomId: string) {
    const client = this.redisService.getClient();
    const key = this.getKey(roomId);

    return await client.zRangeWithScores(key, 0, -1, { REV: true });
  }

  async delete(roomId: string) {
    const client = this.redisService.getClient();
    const key = this.getKey(roomId);

    await client.del(key);
  }
}
