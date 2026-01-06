import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { GameRoom } from 'src/common/types';
import { GamePhase } from 'src/common/constants';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { RoomWaitlistService } from 'src/redis/cache/room-waitlist.service';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';

@Injectable()
export class GameService {
  constructor(
    private readonly cacheService: GameRoomCacheService,
    private readonly waitlistService: RoomWaitlistService,
  ) {}

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

  async joinRoom(
    roomId: string,
    nickname: string,
    socketId: string,
  ): Promise<GameRoom | null> {
    const room = await this.cacheService.getRoom(roomId);

    if (!room) {
      throw new WebsocketException('방이 존재하지 않습니다.');
    }

    if (room.players.length >= room.settings.maxPlayer) {
      throw new WebsocketException('방이 꽉 찼습니다.');
    }

    const phase = room.phase;

    if (phase === GamePhase.DRAWING) {
      await this.waitlistService.addPlayer(roomId, socketId);
      return null;
    }

    room.players.push({
      nickname,
      socketId,
      isHost: room.players.length === 0,
    });

    this.cacheService.saveRoom(roomId, room);
    return room;
  }
}
