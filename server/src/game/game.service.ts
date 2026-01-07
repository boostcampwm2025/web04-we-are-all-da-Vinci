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

    const target = room.players.find((player) => player.socketId === socketId);

    if (!target) {
      return null;
    }
    room.players = room.players.filter(
      (player) => player.socketId !== socketId,
    );

    if (target.isHost && room.players.length > 0) {
      room.players[0].isHost = true;
    }

    await this.cacheService.saveRoom(roomId, room);
    await this.playerCacheService.delete(socketId);

    return room;
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

  async startGame(roomId: string) {
    const room = await this.cacheService.getRoom(roomId);
    if (!room) {
      throw new WebsocketException('방이 존재하지 않습니다.');
    }

    await this.cacheService.saveRoom(roomId, room);
  }

  async getRoom(roomId: string): Promise<GameRoom | null> {
    return await this.cacheService.getRoom(roomId);
  }
}
