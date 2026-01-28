import { Injectable } from '@nestjs/common';
import { RedisKeys } from '../redis-keys';
import { RedisService } from '../redis.service';

@Injectable()
export class WaitlistCacheService {
  constructor(private readonly redisService: RedisService) {}

  async addPlayer(roomId: string, socketId: string): Promise<number> {
    const client = this.redisService.getClient();
    const key = RedisKeys.waitlist(roomId);

    return await client.rPush(key, socketId);
  }
}
