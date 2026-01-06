import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis.service';

@Injectable()
export class RoomWaitlistService {
  constructor(private readonly redisService: RedisService) {}

  private getKey(roomId: string) {
    return `waiting:${roomId}`;
  }

  async addPlayer(roomId: string, socketId: string): Promise<number> {
    const client = this.redisService.getClient();

    const key = this.getKey(roomId);

    return await client.rPush(key, socketId);
  }
}
