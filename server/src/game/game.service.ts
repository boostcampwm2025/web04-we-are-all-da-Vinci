import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { GameRoom, Stroke } from 'src/common/types';
import { GamePhase } from 'src/common/constants';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { WaitlistCacheService } from 'src/redis/cache/waitlist-cache.service';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';
import { PlayerCacheService } from 'src/redis/cache/player-cache.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { LeaderboardCacheService } from 'src/redis/cache/leaderboard-cache.service';
import { RoundService } from 'src/round/round.service';
import path from 'node:path';
import fs from 'fs/promises';

@Injectable()
export class GameService {
  private readonly NEXT_HOST_INDEX = 1;

  constructor(
    private readonly cacheService: GameRoomCacheService,
    private readonly waitlistService: WaitlistCacheService,
    private readonly playerCacheService: PlayerCacheService,
    private readonly leaderboardCacheService: LeaderboardCacheService,
    private readonly roundService: RoundService,
  ) {}

  async createRoom(createRoomDto: CreateRoomDto) {
    const roomId = await this.generateRoomId();

    const promptId = await this.getRandomPromptId();
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
      promptId: promptId,
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
      throw new WebsocketException('방이 존재하지 않습니다.');
    }

    const player = room.players.find((player) => player.socketId === socketId);

    if (!player) {
      throw new WebsocketException('플레이어가 존재하지 않습니다.');
    }

    if (!player.isHost) {
      throw new WebsocketException('방장 권한이 없습니다.');
    }

    if (maxPlayer < room.players.length) {
      return;
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
    await this.leaderboardCacheService.updateScore(roomId, socketId, 0);

    const updatedRoom = await this.cacheService.getRoom(roomId);
    return updatedRoom;
  }

  async startGame(roomId: string, socketId: string) {
    const room = await this.cacheService.getRoom(roomId);
    if (!room) {
      throw new WebsocketException('방이 존재하지 않습니다.');
    }

    if (room.phase !== GamePhase.WAITING) {
      throw new WebsocketException('게임이 이미 진행 중입니다.');
    }

    const player = room.players.find((player) => player.socketId === socketId);

    if (!player) {
      throw new WebsocketException(
        '플레이어가 존재하지 않습니다. 재접속이 필요합니다.',
      );
    }

    if (!player.isHost) {
      throw new WebsocketException('방장 권한이 없습니다.');
    }

    if (room.players.length < 2) {
      throw new WebsocketException('게임을 시작하려면 최소 2명이 필요합니다.');
    }
    await this.roundService.nextPhase(room);
  }

  async getRoom(roomId: string): Promise<GameRoom | null> {
    return await this.cacheService.getRoom(roomId);
  }

  async restartGame(roomId: string, socketId: string) {
    const room = await this.cacheService.getRoom(roomId);
    if (!room) {
      throw new WebsocketException('방이 존재하지 않습니다.');
    }

    if (room.phase !== GamePhase.GAME_END) {
      throw new WebsocketException('게임이 종료 상태가 아닙니다.');
    }

    const player = room.players.find((player) => player.socketId === socketId);

    if (!player) {
      throw new WebsocketException(
        '플레이어가 존재하지 않습니다. 재접속이 필요합니다.',
      );
    }

    if (!player.isHost) {
      throw new WebsocketException('방장만 재시작할 수 있습니다.');
    }

    await this.roundService.nextPhase(room);
  }

  async kickUser(roomId: string, hostSocketId: string, targetSocketId: string) {
    const room = await this.cacheService.getRoom(roomId);
    if (!room) {
      throw new WebsocketException('방이 존재하지 않습니다.');
    }

    if (room.phase !== GamePhase.WAITING) {
      throw new WebsocketException('대기 상태에서만 퇴장시킬 수 있습니다.');
    }

    const hostPlayer = room.players.find(
      (player) => player.socketId === hostSocketId,
    );
    const targetPlayer = room.players.find(
      (player) => player.socketId === targetSocketId,
    );

    if (!hostPlayer || !targetPlayer) {
      throw new WebsocketException('플레이어가 존재하지 않습니다.');
    }

    if (!hostPlayer.isHost) {
      throw new WebsocketException('방장만 퇴장시킬 수 있습니다.');
    }

    if (targetPlayer.isHost) {
      throw new WebsocketException('방장을 퇴장시킬 수 없습니다.');
    }

    const kickedPlayer = {
      socketId: targetPlayer.socketId,
      nickname: targetPlayer.nickname,
    };

    const updatedRoom = await this.leaveRoom(targetSocketId);
    if (!updatedRoom) {
      throw new WebsocketException('방이 없습니다.');
    }
    return { updatedRoom, kickedPlayer };
  }

  private async loadPromptStrokes(): Promise<Stroke[][]> {
    const promptPath = path.join(process.cwd(), 'data', 'promptStrokes.json');
    const data = await fs.readFile(promptPath, 'utf-8');
    const promptStrokesData = JSON.parse(data) as Stroke[][];
    return promptStrokesData;
  }

  private async getRandomPromptId(): Promise<number> {
    const promptStrokesData = await this.loadPromptStrokes();

    const id = Math.floor(Math.random() * promptStrokesData.length);
    return id;
  }
}
