import { Injectable, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { GameRoom, Player } from 'src/common/types';

import { GamePhase } from 'src/common/constants';
import { ErrorCode } from 'src/common/constants/error-code';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';

import { findPlayerOrThrow, requireHost } from 'src/common/utils/player.utils';
import { PromptService } from 'src/prompt/prompt.service';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { LeaderboardCacheService } from 'src/redis/cache/leaderboard-cache.service';
import { PlayerCacheService } from 'src/redis/cache/player-cache.service';
import { RoundService } from 'src/round/round.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { GameProgressCacheService } from 'src/redis/cache/game-progress-cache.service';
import { WaitlistService } from './waitlist.service';

interface PhaseChangeHandler {
  (roomId: string, joinedPlayers: Player[]): Promise<void>;
}

@Injectable()
export class GameService implements OnModuleInit {
  private phaseChangeHandler?: PhaseChangeHandler;

  constructor(
    private readonly cacheService: GameRoomCacheService,
    private readonly playerCacheService: PlayerCacheService,
    private readonly leaderboardCacheService: LeaderboardCacheService,
    private readonly progressCacheService: GameProgressCacheService,
    private readonly roundService: RoundService,
    private readonly promptService: PromptService,
    private readonly waitlistService: WaitlistService,
  ) {}

  onModuleInit() {
    this.roundService.setPhaseChangeHandler(async (roomId: string) => {
      const newlyJoinedPlayers =
        await this.waitlistService.getNewlyJoinedUserFromWaitlist(roomId);
      if (this.phaseChangeHandler) {
        await this.phaseChangeHandler(roomId, newlyJoinedPlayers);
      }
    });
  }

  setPhaseChangeHandler(handler: PhaseChangeHandler) {
    this.phaseChangeHandler = handler;
  }

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
      // 대기자일 수 있으니 대기열 제거 처리
      await this.waitlistService.deleteWaitPlayer(roomId, socketId);
      await this.playerCacheService.delete(socketId);
      return null;
    }

    await this.cacheService.deletePlayer(roomId, socketId);
    await this.playerCacheService.delete(socketId);
    await this.leaderboardCacheService.delete(roomId, socketId);
    await this.progressCacheService.deletePlayer(roomId, socketId);

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

    const player = findPlayerOrThrow(room.players, socketId);
    requireHost(player);

    if (room.phase !== GamePhase.WAITING) {
      throw new WebsocketException(
        ErrorCode.UPDATE_SETTINGS_ONLY_WAITING_PHASE,
      );
    }

    if (maxPlayer < room.players.length) {
      return;
    }

    if (totalRounds !== room.settings.totalRounds) {
      await this.promptService.resetPromptIds(roomId, totalRounds);
    }

    Object.assign(room.settings, { maxPlayer, totalRounds, drawingTime });
    await this.cacheService.saveRoom(roomId, room);

    return room;
  }

  async joinRoom(
    roomId: string,
    nickname: string,
    profileId: string,
    socketId: string,
  ): Promise<{ room: GameRoom | null; newlyJoinedPlayers: Player[] }> {
    const room = await this.cacheService.getRoom(roomId);

    if (!room) {
      throw new WebsocketException(ErrorCode.ROOM_NOT_FOUND);
    }

    const isFull = await this.waitlistService.isRoomFull(
      roomId,
      room.settings.maxPlayer,
      room.players.length,
    );

    if (isFull) {
      throw new WebsocketException(ErrorCode.ROOM_FULL);
    }

    await this.playerCacheService.set(socketId, roomId);

    // 무조건 대기열을 거쳐서 입장
    const newlyJoinedPlayers = await this.waitlistService.requestJoinRoom(
      roomId,
      socketId,
      nickname,
      profileId,
    );

    const updatedRoom = await this.cacheService.getRoom(roomId);

    return { room: updatedRoom, newlyJoinedPlayers };
  }

  async startGame(roomId: string, socketId: string) {
    const room = await this.cacheService.getRoom(roomId);
    if (!room) {
      throw new WebsocketException(ErrorCode.ROOM_NOT_FOUND);
    }

    if (room.phase !== GamePhase.WAITING) {
      throw new WebsocketException(ErrorCode.GAME_ALREADY_STARTED);
    }

    const player = findPlayerOrThrow(room.players, socketId);
    requireHost(player);

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

    const player = findPlayerOrThrow(room.players, socketId);
    requireHost(player);

    await this.roundService.nextPhase(room);
  }

  async kickUser(roomId: string, hostSocketId: string, targetSocketId: string) {
    const room = await this.cacheService.getRoom(roomId);
    if (!room) {
      throw new WebsocketException(ErrorCode.ROOM_NOT_FOUND);
    }

    if (room.phase !== GamePhase.WAITING) {
      throw new WebsocketException(ErrorCode.KICK_ONLY_WAITING_PHASE);
    }

    const hostPlayer = findPlayerOrThrow(room.players, hostSocketId);
    const targetPlayer = findPlayerOrThrow(room.players, targetSocketId);
    requireHost(hostPlayer);

    if (targetPlayer.isHost) {
      throw new WebsocketException(ErrorCode.HOST_CAN_NOT_KICKED);
    }

    const kickedPlayer = {
      socketId: targetPlayer.socketId,
      nickname: targetPlayer.nickname,
    };

    const updatedRoom = await this.leaveRoom(targetSocketId);
    if (!updatedRoom) {
      throw new WebsocketException(ErrorCode.ROOM_NOT_FOUND);
    }
    return { updatedRoom, kickedPlayer };
  }

  async startPractice() {
    const randomPrompt = await this.promptService.getRandomPrompt();
    return randomPrompt;
  }

  private async generateRoomId() {
    let roomId = randomUUID().toString().substring(0, 8);
    while (await this.cacheService.getRoom(roomId)) {
      roomId = randomUUID().toString().substring(0, 8);
    }
    return roomId;
  }

  async getSyncData(roomId: string) {
    const room = await this.cacheService.getRoom(roomId);
    if (!room) return null;

    switch (room.phase) {
      case GamePhase.ROUND_REPLAY:
        return await this.roundService.getRoundReplayData(roomId);
      case GamePhase.ROUND_STANDING:
        return await this.roundService.getRoundStandingData(roomId);
      case GamePhase.GAME_END:
        return await this.roundService.getGameEndData(roomId);
      default:
        return null;
    }
  }
}
