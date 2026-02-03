import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { GamePhase } from 'src/common/constants';
import { ErrorCode } from 'src/common/constants/error-code';
import { InternalError } from 'src/common/exceptions/internal-error';
import { GameRoom } from 'src/common/types';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';

@Injectable()
export class RoomService {
  constructor(private readonly gameRoomCache: GameRoomCacheService) {}

  async createRoom(
    maxPlayer: number,
    drawingTime: number,
    totalRounds: number,
  ) {
    const roomId = await this.generateRoomId();

    const gameRoom: GameRoom = {
      roomId,
      players: [],
      phase: GamePhase.WAITING,
      currentRound: 0,
      settings: {
        drawingTime: drawingTime,
        maxPlayer: maxPlayer,
        totalRounds: totalRounds,
      },
    };
    await this.gameRoomCache.saveRoom(roomId, gameRoom);

    return roomId;
  }

  async updateSettings(
    room: GameRoom,
    maxPlayer: number,
    drawingTime: number,
    totalRounds: number,
  ) {
    Object.assign(room.settings, { maxPlayer, totalRounds, drawingTime });
    await this.gameRoomCache.saveRoom(room.roomId, room);

    return room;
  }

  async deleteRoom(roomId: string) {
    await this.gameRoomCache.deleteRoom(roomId);
  }

  async getRoom(roomId: string) {
    const room = await this.gameRoomCache.getRoom(roomId);
    if (!room) {
      throw new InternalError(ErrorCode.ROOM_NOT_FOUND);
    }
    return room;
  }

  async isWaiting(roomId: string) {
    const room = await this.gameRoomCache.getRoom(roomId);
    if (!room) {
      throw new InternalError(ErrorCode.ROOM_NOT_FOUND);
    }

    return room.phase === GamePhase.WAITING;
  }

  private async generateRoomId() {
    let roomId = randomUUID().toString().substring(0, 8);
    while (await this.gameRoomCache.getRoom(roomId)) {
      roomId = randomUUID().toString().substring(0, 8);
    }
    return roomId;
  }
}
