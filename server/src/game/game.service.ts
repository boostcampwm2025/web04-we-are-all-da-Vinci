import { Injectable } from '@nestjs/common';

import { GameRoom, Player } from 'src/common/types';
import { GamePhase } from '../common/constants';
import { ErrorCode } from 'src/common/constants/error-code';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';
import { InternalError } from 'src/common/exceptions/internal-error';
import type { CreateRoomDto } from '@shared/types';

import { PromptService } from 'src/prompt/prompt.service';
import { RoundService } from 'src/round/round.service';
import { PlayerService, LeaveRoomResult } from './player.service';
import { RoomService } from './room.service';

export interface JoinRoomResult {
  room: GameRoom;
  newlyJoinedPlayers: Player[];
  isRecovery: boolean;
  recoveredPlayer?: Player;
}

@Injectable()
export class GameService {
  constructor(
    private readonly roundService: RoundService,
    private readonly promptService: PromptService,
    private readonly playerService: PlayerService,
    private readonly roomService: RoomService,
  ) {}

  async createRoom(createRoomDto: CreateRoomDto) {
    const { drawingTime, maxPlayer, totalRounds } = createRoomDto;

    const roomId = await this.roomService.createRoom(
      maxPlayer,
      drawingTime,
      totalRounds,
    );

    await this.promptService.setPromptIds(roomId, totalRounds);

    return roomId;
  }

  async leaveRoom(
    socketId: string,
  ): Promise<{ room: GameRoom; leaveResult: LeaveRoomResult }> {
    const roomId = await this.playerService.getJoinedRoomId(socketId);
    if (!roomId) {
      throw new InternalError('roomId가 없습니다');
    }

    const room = await this.roomService.getRoom(roomId);

    const leaveResult = await this.playerService.leaveRoom(
      roomId,
      socketId,
      room.phase,
    );
    if (!leaveResult) {
      throw new InternalError(ErrorCode.PLAYER_NOT_FOUND);
    }

    const updatedRoom = await this.roomService.getRoom(roomId);

    return { room: updatedRoom, leaveResult };
  }

  async updateGameSettings(
    roomId: string,
    socketId: string,
    maxPlayer: number,
    totalRounds: number,
    drawingTime: number,
  ) {
    const room = await this.roomService.getRoom(roomId);
    const players = await this.playerService.getPlayers(roomId);

    if (!this.playerService.checkIsHost(players, socketId)) {
      throw new WebsocketException(ErrorCode.PLAYER_NOT_HOST);
    }

    if (room.phase !== GamePhase.WAITING) {
      throw new WebsocketException(
        ErrorCode.UPDATE_SETTINGS_ONLY_WAITING_PHASE,
      );
    }

    if (players.length > maxPlayer) {
      maxPlayer = room.settings.maxPlayer;
    }

    if (totalRounds !== room.settings.totalRounds) {
      await this.promptService.resetPromptIds(room.roomId, totalRounds);
    }

    const updatedRoom = await this.roomService.updateSettings(
      room,
      maxPlayer,
      drawingTime,
      totalRounds,
    );

    return updatedRoom;
  }

  async joinRoom(
    roomId: string,
    nickname: string,
    profileId: string,
    socketId: string,
  ): Promise<JoinRoomResult> {
    const room = await this.roomService.getRoom(roomId);

    // 1. 세션 복구 시도 (Grace Period 내 새로고침)
    const recoveryResult = await this.playerService.tryRecoverSession(
      roomId,
      profileId,
      socketId,
      nickname,
      room.phase,
    );

    if (recoveryResult) {
      const updatedRoom = await this.roomService.getRoom(roomId);
      return {
        room: updatedRoom,
        newlyJoinedPlayers: [],
        isRecovery: true,
        recoveredPlayer: recoveryResult.player,
      };
    }

    // 2. 신규 입장 처리
    const isFull = await this.playerService.isRoomFull(
      roomId,
      room.settings.maxPlayer,
      room.players.length,
    );

    if (isFull) {
      throw new WebsocketException(ErrorCode.ROOM_FULL);
    }

    // 무조건 대기열을 거쳐서 입장
    const newlyJoinedPlayers = await this.playerService.requestJoinWaitList(
      roomId,
      socketId,
      nickname,
      profileId,
    );

    const updatedRoom = await this.roomService.getRoom(roomId);

    return {
      room: updatedRoom,
      newlyJoinedPlayers,
      isRecovery: false,
    };
  }

  async startGame(roomId: string, socketId: string) {
    const room = await this.roomService.getRoom(roomId);

    if (room.phase !== GamePhase.WAITING) {
      throw new WebsocketException(ErrorCode.GAME_ALREADY_STARTED);
    }

    const players = await this.playerService.getPlayers(roomId);

    if (!this.playerService.checkIsHost(players, socketId)) {
      throw new WebsocketException(ErrorCode.PLAYER_NOT_HOST);
    }

    if (players.length < 2) {
      throw new WebsocketException(ErrorCode.PLAYER_ATLEAST_TWO);
    }

    await this.roundService.nextPhase(room);
  }

  async getRoom(roomId: string): Promise<GameRoom> {
    return await this.roomService.getRoom(roomId);
  }

  async restartGame(roomId: string, socketId: string) {
    const room = await this.roomService.getRoom(roomId);

    if (room.phase !== GamePhase.GAME_END) {
      throw new WebsocketException(ErrorCode.GAME_NOT_END);
    }

    const players = await this.playerService.getPlayers(roomId);

    const isHost = this.playerService.checkIsHost(players, socketId);

    if (!isHost) {
      throw new WebsocketException(ErrorCode.PLAYER_NOT_HOST);
    }

    await this.roundService.nextPhase(room);
  }

  async kickUser(roomId: string, hostSocketId: string, targetSocketId: string) {
    const isWaiting = await this.roomService.isWaiting(roomId);
    if (!isWaiting) {
      throw new WebsocketException(ErrorCode.KICK_ONLY_WAITING_PHASE);
    }

    const players = await this.playerService.getPlayers(roomId);

    if (!this.playerService.checkIsHost(players, hostSocketId)) {
      throw new WebsocketException(ErrorCode.PLAYER_NOT_HOST);
    }

    if (this.playerService.checkIsHost(players, targetSocketId)) {
      throw new WebsocketException(ErrorCode.HOST_CAN_NOT_KICKED);
    }

    // kick은 Grace Period 무시하고 즉시 완전 삭제
    const kickedPlayer = await this.playerService.forceKickPlayer(
      roomId,
      targetSocketId,
    );

    if (!kickedPlayer) {
      throw new WebsocketException(ErrorCode.PLAYER_NOT_FOUND);
    }

    const room = await this.roomService.getRoom(roomId);

    return { room, kickedPlayer };
  }

  async startPractice() {
    const randomPrompt = await this.promptService.getRandomPrompt();
    return randomPrompt;
  }

  async getNewlyJoinedPlayers(roomId: string) {
    return await this.playerService.getNewlyJoinedUserFromWaitlist(roomId);
  }

  async getSyncData(roomId: string) {
    const room = await this.roomService.getRoom(roomId);

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
