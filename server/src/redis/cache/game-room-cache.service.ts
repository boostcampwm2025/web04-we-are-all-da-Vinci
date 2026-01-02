import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis.service';

interface Player {
  socketId: string;
  nickname: string;
  isHost: boolean;
}

interface Settings {
  drawingTime: number;
  totalRounds: number;
  maxPlayer: number;
}

interface GameRoom {
  roomId: string;
  players: Player[];
  phase: 'WAITING' | 'PROMPT' | 'DRAWING' | 'ROUND_END' | 'GAME_END';
  currentRound: number;
  settings: Settings;
}

@Injectable()
export class GameRoomCacheService {
  constructor(private readonly redisService: RedisService) {}

  async saveRoom(roomId: string, gameRoom: GameRoom) {
    const client = this.redisService.getClient();
    const key = `room:${roomId}`;

    await client.hSet(key, {
      roomId,
      players: JSON.stringify(gameRoom.players),
      phase: gameRoom.phase,
      currentRound: String(gameRoom.currentRound),
      settings: JSON.stringify(gameRoom.settings),
    });

    await client.expire(key, 3600);
    await client.sAdd('active:rooms', roomId);
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
      players: JSON.parse(data.players),
      phase: data.phase,
      currentRound: parseInt(data.currentRound),
      settings: JSON.parse(data.settings),
    };
  }

  async deleteRoom(roomId: string) {
    const client = this.redisService.getClient();
    await client.sRem('active:rooms', roomId);
    await client.del(`room:${roomId}`);
  }
}
