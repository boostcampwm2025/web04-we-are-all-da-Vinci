import { Injectable, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { GameRoom, Player } from 'src/common/types';
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

interface PhaseChangeHandler {
  (roomId: string, joinedPlayers: Player[]): Promise<void>;
}

@Injectable()
export class GameService implements OnModuleInit {
  private readonly NEXT_HOST_INDEX = 1;
  private phaseChangeHandler?: PhaseChangeHandler;

  constructor(
    private readonly cacheService: GameRoomCacheService,
    private readonly waitlistService: WaitlistCacheService,
    private readonly playerCacheService: PlayerCacheService,
    private readonly leaderboardCacheService: LeaderboardCacheService,
    private readonly roundService: RoundService,
    private readonly promptService: PromptService,
  ) {}

  onModuleInit() {
    this.roundService.setPhaseChangeHandler(async (roomId: string) => {
      const newlyJoinedPlayers =
        await this.getNewlyJoinedUserFromWaitlist(roomId);
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
  ): Promise<GameRoom | null> {
    const room = await this.cacheService.getRoom(roomId);

    if (!room) {
      throw new WebsocketException(ErrorCode.ROOM_NOT_FOUND);
    }

    const waitlistSize = await this.waitlistService.getWaitlistSize(roomId);
    if (room.players.length + waitlistSize >= room.settings.maxPlayer) {
      throw new WebsocketException(ErrorCode.ROOM_FULL);
    }

    // 무조건 대기열을 거쳐서 입장
    await this.waitlistService.addWaitPlayer(roomId, {
      nickname,
      profileId,
      socketId,
      isHost: false,
    });
    await this.playerCacheService.set(socketId, roomId);

    const newlyJoinedPlayers =
      await this.getNewlyJoinedUserFromWaitlist(roomId);

    // 유저가 이번에 join 가능한지 확인
    const isJoined = newlyJoinedPlayers.some(
      (player) => player.socketId === socketId,
    );

    if (newlyJoinedPlayers.length > 0 && this.phaseChangeHandler) {
      await this.phaseChangeHandler(roomId, newlyJoinedPlayers); // gateway에 알림
    }

    // join 가능하면 room 정보 전달
    if (isJoined) {
      return await this.cacheService.getRoom(roomId);
    }

    // join 불가 상태일 때는 null 반환
    return null;
  }

  // 대기열 관리: 대기열에서 참여할 플레이어 리스트 반환
  async getNewlyJoinedUserFromWaitlist(roomId: string): Promise<Player[]> {
    const room = await this.cacheService.getRoom(roomId);
    if (!room) {
      throw new WebsocketException(ErrorCode.ROOM_NOT_FOUND);
    }

    // prompt, drawing 단계에서는 대기 유지
    if (room.phase === GamePhase.PROMPT || room.phase === GamePhase.DRAWING) {
      return [];
    }

    const newlyJoinedPlayers: Player[] = [];

    // 이외 phase에서는 참여
    while (true) {
      const currentRoom = await this.cacheService.getRoom(roomId);
      if (!currentRoom) {
        throw new WebsocketException(ErrorCode.ROOM_NOT_FOUND);
      }
      const maxPlayer = currentRoom.settings.maxPlayer;
      const currentPlayerCount = currentRoom.players.length;

      if (currentPlayerCount >= maxPlayer) break;

      const waitPlayer = await this.waitlistService.popWaitPlayer(roomId);
      if (!waitPlayer) break;

      const players = await this.cacheService.getAllPlayers(roomId);
      const newPlayer = { ...waitPlayer, isHost: players.length === 0 };

      await this.cacheService.addPlayer(roomId, newPlayer);
      await this.playerCacheService.set(newPlayer.socketId, roomId);
      await this.leaderboardCacheService.updateScore(
        roomId,
        newPlayer.socketId,
        0,
      );

      newlyJoinedPlayers.push(newPlayer);
    }

    return newlyJoinedPlayers;
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

  async kickUser(roomId: string, hostSocketId: string, targetSocketId: string) {
    const room = await this.cacheService.getRoom(roomId);
    if (!room) {
      throw new WebsocketException(ErrorCode.ROOM_NOT_FOUND);
    }

    if (room.phase !== GamePhase.WAITING) {
      throw new WebsocketException(ErrorCode.KICK_ONLY_WAITING_PHASE);
    }

    const hostPlayer = room.players.find(
      (player) => player.socketId === hostSocketId,
    );
    const targetPlayer = room.players.find(
      (player) => player.socketId === targetSocketId,
    );

    if (!hostPlayer || !targetPlayer) {
      throw new WebsocketException(ErrorCode.PLAYER_NOT_FOUND);
    }

    if (!hostPlayer.isHost) {
      throw new WebsocketException(ErrorCode.PLAYER_NOT_HOST);
    }

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
