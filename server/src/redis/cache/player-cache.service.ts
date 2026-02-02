import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis.service';
import { RedisKeys } from '../redis-keys';
import { REDIS_TTL } from '../../common/constants';

@Injectable()
export class PlayerCacheService {
  constructor(private readonly redisService: RedisService) {}

  async set(socketId: string, roomId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.player(socketId);

    await client.set(key, roomId);
    await client.expire(key, REDIS_TTL);
  }

  async delete(socketId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.player(socketId);

    const roomId = await client.getDel(key);

    return roomId;
  }

  async getRoomId(socketId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.player(socketId);

    const roomId = await client.get(key);

    return roomId;
  }
}
