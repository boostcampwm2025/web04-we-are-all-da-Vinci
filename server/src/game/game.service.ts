import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { GameRoom } from 'src/common/types';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';

@Injectable()
export class GameService {
  constructor(private readonly cacheService: GameRoomCacheService) {}

  async createRoom() {
    const roomId = await this.generateRoomId();

    const gameRoom: GameRoom = {
      roomId,
      players: [],
      phase: 'WAITING',
      currentRound: 0,
      settings: { drawingTime: 40, maxPlayer: 8, totalRounds: 4 },
    };

    await this.cacheService.saveRoom(roomId, gameRoom);

    return roomId;
  }

  private async generateRoomId() {
    let roomId = randomUUID().toString().substring(0, 8);
    while (await this.cacheService.getRoom(roomId)) {
      roomId = randomUUID().toString().substring(0, 8);
    }
    return roomId;
  }
}
