import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { GameRoom } from 'src/common/types';
import { GamePhase } from 'src/common/constants';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { WaitlistCacheService } from 'src/redis/cache/waitlist-cache.service';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';
import { PlayerCacheService } from 'src/redis/cache/player-cache.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { LeaderboardCacheService } from 'src/redis/cache/leaderboard-cache.service';
import { RoundService } from 'src/round/round.service';
import { PromptService } from 'src/prompt/prompt.service';
import { ErrorCode } from 'src/common/constants/error-code';

@Injectable()
export class GameService {
  private readonly NEXT_HOST_INDEX = 1;

  constructor(
    private readonly cacheService: GameRoomCacheService,
    private readonly waitlistService: WaitlistCacheService,
    private readonly playerCacheService: PlayerCacheService,
    private readonly leaderboardCacheService: LeaderboardCacheService,
    private readonly roundService: RoundService,
    private readonly promptService: PromptService,
  ) {}

  async createRoom(createRoomDto: CreateRoomDto) {
    const roomId = await this.generateRoomId();

    const { drawingTime, maxPlayer, totalRounds } = createRoomDto;

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
    await this.promptService.setPromptIds(roomId, totalRounds);
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

    if (target.isHost && players.length > this.NEXT_HOST_INDEX) {
      const nextHost = players[this.NEXT_HOST_INDEX];
      await this.cacheService.setPlayer(roomId, this.NEXT_HOST_INDEX, {
        ...nextHost,
        isHost: true,
      });
    }

    await this.cacheService.deletePlayer(roomId, target);
    await this.playerCacheService.delete(socketId);
    await this.leaderboardCacheService.delete(roomId, socketId);

    const updatedRoom = await this.cacheService.getRoom(roomId);
    return updatedRoom;
  }

  async updateGameSettings(
    roomId: string,
    socketId: string,
    maxPlayer: number,
    totalRounds: number,
    drawingTime: number,
  ) {
    const room = await this.cacheService.getRoom(roomId);

    if (!room) {
      throw new WebsocketException(ErrorCode.ROOM_NOT_FOUND);
    }

    const player = room.players.find((player) => player.socketId === socketId);

    if (!player) {
      throw new WebsocketException(ErrorCode.PLAYER_NOT_FOUND);
    }

    if (!player.isHost) {
      throw new WebsocketException(ErrorCode.PLAYER_NOT_HOST);
    }

    if (maxPlayer < room.players.length) {
      throw new WebsocketException('현재 인원보다 작게 설정할 수 없습니다.');
    }

    if (totalRounds !== room.settings.totalRounds) {
      await this.promptService.resetPromptIds(roomId, totalRounds);
    }

    Object.assign(room.settings, { maxPlayer, totalRounds, drawingTime });
    await this.cacheService.saveRoom(roomId, room);

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
      throw new WebsocketException(ErrorCode.ROOM_NOT_FOUND);
    }

    if (room.players.length >= room.settings.maxPlayer) {
      throw new WebsocketException(ErrorCode.ROOM_FULL);
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
    await this.leaderboardCacheService.updateScore(roomId, socketId, 0);

    const updatedRoom = await this.cacheService.getRoom(roomId);
    return updatedRoom;
  }

  async startGame(roomId: string, socketId: string) {
    const room = await this.cacheService.getRoom(roomId);
    if (!room) {
      throw new WebsocketException(ErrorCode.ROOM_NOT_FOUND);
    }

    if (room.phase !== GamePhase.WAITING) {
      throw new WebsocketException(ErrorCode.GAME_ALREADY_STARTED);
    }

    const player = room.players.find((player) => player.socketId === socketId);

    if (!player) {
      throw new WebsocketException(ErrorCode.PLAYER_NOT_FOUND);
    }

    if (!player.isHost) {
      throw new WebsocketException(ErrorCode.PLAYER_NOT_HOST);
    }

    if (room.players.length < 2) {
      throw new WebsocketException(ErrorCode.PLAYER_ATLEAST_TWO);
    }
    await this.roundService.nextPhase(room);
  }

  async getRoom(roomId: string): Promise<GameRoom | null> {
    return await this.cacheService.getRoom(roomId);
  }

  async restartGame(roomId: string, socketId: string) {
    const room = await this.cacheService.getRoom(roomId);
    if (!room) {
      throw new WebsocketException(ErrorCode.ROOM_NOT_FOUND);
    }

    if (room.phase !== GamePhase.GAME_END) {
      throw new WebsocketException(ErrorCode.GAME_NOT_END);
    }

    const player = room.players.find((player) => player.socketId === socketId);

    if (!player) {
      throw new WebsocketException(ErrorCode.PLAYER_NOT_FOUND);
    }

    if (!player.isHost) {
      throw new WebsocketException(ErrorCode.PLAYER_NOT_HOST);
    }

    await this.roundService.nextPhase(room);
  }
}
