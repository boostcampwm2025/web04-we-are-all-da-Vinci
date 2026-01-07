import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis.service';
import { GameRoom, Player, Settings } from 'src/common/types';
import { REDIS_TTL } from 'src/common/constants';

@Injectable()
export class GameRoomCacheService {
  constructor(private readonly redisService: RedisService) {}

  private getRoomKey(roomId: string) {
    return `room:${roomId}:info`;
  }

  private getActiveRoomsKey() {
    return `active:rooms`;
  }

  private getPlayerListKey(roomId: string) {
    return `room:${roomId}:players`;
  }

  async saveRoom(roomId: string, gameRoom: GameRoom) {
    const client = this.redisService.getClient();
    const key = this.getRoomKey(roomId);

    await client.hSet(key, {
      roomId,
      players: JSON.stringify(gameRoom.players),
      phase: gameRoom.phase,
      currentRound: String(gameRoom.currentRound),
      settings: JSON.stringify(gameRoom.settings),
    });

    await client.expire(key, REDIS_TTL);
    await client.sAdd(this.getActiveRoomsKey(), roomId);
  }

  async getRoom(roomId: string) {
    const client = this.redisService.getClient();
    const key = `room:${roomId}`;
    const data = await client.hGetAll(key);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return {
      roomId: data.roomId,
      players: JSON.parse(data.players) as Player[],
      phase: data.phase,
      currentRound: parseInt(data.currentRound),
      settings: JSON.parse(data.settings) as Settings,
    };
  }

  async deleteRoom(roomId: string) {
    const client = this.redisService.getClient();
    await client.sRem(this.getActiveRoomsKey(), roomId);
    await client.del(this.getRoomKey(roomId));
  }

  async addPlayer(roomId: string, player: Player) {
    const client = this.redisService.getClient();
    const key = this.getPlayerListKey(roomId);

    await client.zAdd(key, {
      score: Date.now(),
      value: JSON.stringify(player),
    });
  }

  async deletePlayer(roomId: string, player: Player) {
    const client = this.redisService.getClient();
    const key = this.getPlayerListKey(roomId);

    await client.zRem(key, JSON.stringify(player));
  }

  async getAllPlayers(roomId: string): Promise<Player[]> {
    const client = this.redisService.getClient();
    const key = this.getPlayerListKey(roomId);

    return (await client.zRange(key, 0, -1)).map(
      (value) => JSON.parse(value) as Player,
    );
  }
}
