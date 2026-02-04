import { Injectable } from '@nestjs/common';

import type { CreateRoomDto } from '@shared/types';
import { GameRoom, Player } from 'src/common/types';
import { GamePhase } from '../common/constants';
import { ErrorCode } from 'src/common/constants/error-code';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';

import { PromptService } from 'src/prompt/prompt.service';
import { RoundService } from 'src/round/round.service';
import { PlayerService } from './player.service';
import { RoomService } from './room.service';
import { InternalError } from 'src/common/exceptions/internal-error';

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
  ): Promise<{ room: GameRoom; player: Player }> {
    const roomId = await this.playerService.getJoinedRoomId(socketId);
    if (!roomId) {
      throw new InternalError('roomId가 없습니다');
    }

    const player = await this.playerService.leaveRoom(roomId, socketId);
    if (!player) {
      throw new InternalError(ErrorCode.PLAYER_NOT_FOUND);
    }

    const room = await this.roomService.getRoom(roomId);

    return { room, player };
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
  ): Promise<{ room: GameRoom; newlyJoinedPlayers: Player[] }> {
    const room = await this.roomService.getRoom(roomId);

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

    return { room: updatedRoom, newlyJoinedPlayers };
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

    const { room, player: kickedPlayer } = await this.leaveRoom(targetSocketId);

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
