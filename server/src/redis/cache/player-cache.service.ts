import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis.service';
import { RedisKeys } from '../redis-keys';
import { REDIS_TTL } from '../../common/constants';

@Injectable()
export class PlayerCacheService {
  constructor(private readonly redisService: RedisService) {}

  async setSocketRoom(socketId: string, roomId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.socket(socketId);

    await client.set(key, roomId);
    await client.expire(key, REDIS_TTL);
  }

  async removeSocketRoom(socketId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.socket(socketId);

    const roomId = await client.getDel(key);

    return roomId;
  }

  async getRoomBySocket(socketId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.socket(socketId);

    const roomId = await client.get(key);

    return roomId;
  }
  async setPlayerSocket(profileId: string, roomId: string, socketId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.player(profileId, roomId);

    await client.setEx(key, REDIS_TTL, socketId);
  }

  /**
   * 세션 복구 시 socket->room, player->socket 매핑을 원자적으로 갱신한다.
   */
  async setRecoveryMappings(
    profileId: string,
    roomId: string,
    socketId: string,
  ) {
    const client = this.redisService.getClient();
    const socketKey = RedisKeys.socket(socketId);
    const playerKey = RedisKeys.player(profileId, roomId);

    await client
      .multi()
      .setEx(socketKey, REDIS_TTL, roomId)
      .setEx(playerKey, REDIS_TTL, socketId)
      .exec();
  }

  async getSocketByPlayer(profileId: string, roomId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.player(profileId, roomId);

    return await client.getEx(key, { type: 'EX', value: REDIS_TTL });
  }

  async removePlayerSocket(profileId: string, roomId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.player(profileId, roomId);

    await client.unlink(key);
  }
}
