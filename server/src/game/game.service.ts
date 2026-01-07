import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { GameRoom } from 'src/common/types';
import { GamePhase } from 'src/common/constants';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { WaitlistCacheService } from 'src/redis/cache/waitlist-cache.service';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';
import { PlayerCacheService } from 'src/redis/cache/player-cache.service';
import { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class GameService {
  constructor(
    private readonly cacheService: GameRoomCacheService,
    private readonly waitlistService: WaitlistCacheService,
    private readonly playerCacheService: PlayerCacheService,
  ) {}

  async createRoom(createRoomDto: CreateRoomDto) {
    const roomId = await this.generateRoomId();

    const gameRoom: GameRoom = {
      roomId,
      players: [],
      phase: GamePhase.WAITING,
      currentRound: 0,
      settings: {
        drawingTime: createRoomDto.drawingTime,
        maxPlayer: createRoomDto.maxPlayer,
        totalRounds: createRoomDto.totalRounds,
      },
    };

    await this.cacheService.saveRoom(roomId, gameRoom);

    return roomId;
  }

  async leaveRoom(socketId: string): Promise<GameRoom | null> {
    const roomId = await this.playerCacheService.getRoomId(socketId);
    if (!roomId) {
      return null;
    }

    const room = await this.cacheService.getRoom(roomId);

    if (!room) {
      return null;
    }

    const players = await this.cacheService.getAllPlayers(roomId);

    const target = players.find((player) => player.socketId === socketId);

    if (!target) {
      return null;
    }

    if (target.isHost && players.length > 0) {
      const nextHost = players[1];
      await this.cacheService.deletePlayer(roomId, nextHost);
      await this.cacheService.addPlayer(roomId, { ...nextHost, isHost: true });
    }

    await this.cacheService.deletePlayer(roomId, target);
    await this.playerCacheService.delete(socketId);

    const updatedRoom = await this.cacheService.getRoom(roomId);
    return updatedRoom;
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

    const players = await this.cacheService.getAllPlayers(roomId);

    await this.cacheService.addPlayer(roomId, {
      nickname,
      socketId,
      isHost: players.length === 0,
    });

    await this.playerCacheService.set(socketId, roomId);

    const updatedRoom = await this.cacheService.getRoom(roomId);
    return updatedRoom;
  }
}
