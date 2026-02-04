import { Injectable } from '@nestjs/common';
import { Player } from 'src/common/types';
import { RedisKeys } from '../redis-keys';
import { RedisService } from '../redis.service';
import { PlayerSchema } from '@shared/types';

@Injectable()
export class WaitlistCacheService {
  constructor(private readonly redisService: RedisService) {}

  async addWaitPlayer(roomId: string, player: Player): Promise<number> {
    const client = this.redisService.getClient();
    const key = RedisKeys.waitlist(roomId);
    return await client.rPush(key, JSON.stringify(player));
  }

  // 대기열 첫번째 유저 pop
  async popWaitPlayer(roomId: string): Promise<Player | null> {
    const client = this.redisService.getClient();
    const key = RedisKeys.waitlist(roomId);
    const rawPlayer = await client.lPop(key);
    if (!rawPlayer) return null;
    return PlayerSchema.parse(JSON.parse(rawPlayer));
  }

  // 대기열에서 특정유저 제거
  async deleteWaitPlayer(roomId: string, socketId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.waitlist(roomId);
    const waitlist = await this.getWaitlist(roomId);
    for (const player of waitlist) {
      if (player.socketId === socketId) {
        await client.lRem(key, 0, JSON.stringify(player));
        break;
      }
    }
  }

  async getWaitlist(roomId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.waitlist(roomId);
    const waitlist = await client.lRange(key, 0, -1);
    return waitlist.map((player) => PlayerSchema.parse(JSON.parse(player)));
  }

  async getWaitlistSize(roomId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.waitlist(roomId);
    return await client.lLen(key);
  }
}
