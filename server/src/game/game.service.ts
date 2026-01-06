import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { GameRoom } from 'src/common/types';
import { GamePhase } from 'src/common/constants';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { RoomWaitlistService } from 'src/redis/cache/room-waitlist.service';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';
import { PlayerCacheService } from 'src/redis/cache/player-cache.service';

@Injectable()
export class GameService {
  private readonly defaultGameSettings = {
    drawingTime: 40,
    maxPlayer: 5,
    totalRounds: 1,
  };

  constructor(
    private readonly cacheService: GameRoomCacheService,
    private readonly waitlistService: RoomWaitlistService,
    private readonly playerCacheService: PlayerCacheService,
  ) {}

  async createRoom() {
    const roomId = await this.generateRoomId();

    const gameRoom: GameRoom = {
      roomId,
      players: [],
      phase: GamePhase.WAITING,
      currentRound: 0,
      settings: this.defaultGameSettings,
    };

    await this.cacheService.saveRoom(roomId, gameRoom);

    return roomId;
  }

  async leaveRoom(socketId: string) {
    const roomId = await this.playerCacheService.getRoomId(socketId);
    if (!roomId) {
      return;
    }

    const room = await this.cacheService.getRoom(roomId);

    if (!room) {
      return;
    }

    const target = room.players.find((player) => player.socketId === socketId);

    if (!target) {
      return;
    }
    room.players = room.players.filter(
      (player) => player.socketId !== socketId,
    );

    if (target.isHost && room.players.length > 0) {
      room.players[0].isHost = true;
    }

    await this.cacheService.saveRoom(roomId, room);
    await this.playerCacheService.delete(socketId);
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

    await this.cacheService.saveRoom(roomId, room);
    await this.playerCacheService.set(socketId, roomId);
    return room;
  }
}
