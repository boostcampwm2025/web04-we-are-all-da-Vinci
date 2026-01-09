import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis.service';
import { REDIS_TTL } from 'src/common/constants';

@Injectable()
export class PlayerCacheService {
  constructor(private readonly redisService: RedisService) {}

  private getKey(socketId: string) {
    return `player:${socketId}`;
  }

  async set(socketId: string, roomId: string) {
    const client = this.redisService.getClient();

    const key = this.getKey(socketId);

    await client.set(key, roomId);
    await client.expire(key, REDIS_TTL);
  }

  async delete(socketId: string) {
    const client = this.redisService.getClient();

    const key = this.getKey(socketId);

    const roomId = await client.getDel(key);

    return roomId;
  }

  async getRoomId(socketId: string) {
    const client = this.redisService.getClient();

    const key = this.getKey(socketId);

    const roomId = await client.get(key);

    return roomId;
  }
}
