import { OnModuleInit, UseFilters, UseInterceptors } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { PinoLogger } from 'nestjs-pino';
import { Server, Socket } from 'socket.io';
import { ChatGateway } from 'src/chat/chat.gateway';
import { ChatService } from 'src/chat/chat.service';
import { getSocketCorsOrigin } from 'src/common/config/cors.util';
import { ClientEvents, GamePhase, ServerEvents } from 'src/common/constants';
import { WebsocketExceptionFilter } from 'src/common/exceptions/websocket-exception.filter';
import { MetricInterceptor } from 'src/common/interceptors/metric.interceptor';
import { GameRoom, Player } from 'src/common/types';
import { escapeHtml } from 'src/common/utils/sanitize';
import { MetricService } from 'src/metric/metric.service';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { RoomSettingsDto } from './dto/room-settings.dto';
import { RoomStartDto } from './dto/room-start.dto';
import { UserJoinDto } from './dto/user-join.dto';
import { UserKickDto } from './dto/user-kick.dto';
import { GameService } from './game.service';
import { InternalError } from 'src/common/exceptions/internal-error';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';
import { ErrorCode } from 'src/common/constants/error-code';

@WebSocketGateway({
  cors: {
    origin: getSocketCorsOrigin(),
    credentials: true,
  },
})
@UseFilters(WebsocketExceptionFilter)
@UseInterceptors(MetricInterceptor)
export class GameGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly logger: PinoLogger,
    private readonly gameService: GameService,

    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
    private readonly gameRoomCacheService: GameRoomCacheService,

    private readonly metricService: MetricService,
  ) {
    this.logger.setContext(GameGateway.name);
  }

  onModuleInit() {
    this.gameService.setPhaseChangeHandler(
      async (roomId: string, joinedPlayers: Player[]) => {
        await this.handleWaitlist(roomId, joinedPlayers);
      },
    );
  }

  private async handleWaitlist(roomId: string, joinedPlayers: Player[]) {
    const room = await this.gameService.getRoom(roomId);
    if (!room) {
      return;
    }

    for (const player of joinedPlayers) {
      const socket = this.server.sockets.sockets.get(player.socketId);
      if (socket) {
        await socket.join(roomId);
        await this.chatGateway.sendHistory(socket, roomId);
        await this.syncCurrentPhaseData(socket, room);

        // 입장 시스템 메시지
        const joinMsg = await this.chatService.createJoinMessage(
          roomId,
          player.nickname,
        );
        this.chatGateway.broadcastSystemMessage(roomId, joinMsg);
      }
    }
    this.broadcastMetadata(room);
  }

  handleConnection(client: Socket) {
    this.logger.info({ clientId: client.id }, 'New User Connected');
    this.metricService.incConnection();
  }

  async handleDisconnect(client: Socket) {
    this.logger.info({ clientId: client.id }, 'User Disconnected');
    this.metricService.decConnection();

    try {
      const { room, player } = await this.gameService.leaveRoom(client.id);

      // 퇴장 시스템 메시지
      const leaveMsg = await this.chatService.createLeaveMessage(
        room.roomId,
        player.nickname,
      );
      this.chatGateway.broadcastSystemMessage(room.roomId, leaveMsg);

      // 빈 방이면 삭제 + 채팅 정리
      if (room.players.length === 0) {
        await this.gameRoomCacheService.deleteRoom(room.roomId);
        await this.chatService.clearHistory(room.roomId);
        return;
      }

      this.broadcastMetadata(room);
    } catch (err) {
      this.logger.error(err);
    }
  }

  @SubscribeMessage(ServerEvents.USER_JOIN)
  async joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UserJoinDto,
  ): Promise<string> {
    const { roomId, profileId } = payload;
    const nickname = escapeHtml(payload.nickname.trim());
    const { room, newlyJoinedPlayers } = await this.gameService.joinRoom(
      roomId,
      nickname,
      profileId,
      client.id,
    );

    if (!room) {
      return 'ok';
    }

    // 소켓 룸에는 항상 입장
    await client.join(roomId);

    // 유저가 이번에 join 가능한지 확인
    const isJoined = newlyJoinedPlayers.some(
      (player) => player.socketId === client.id,
    );

    if (newlyJoinedPlayers.length > 0 && this.handleWaitlist) {
      await this.handleWaitlist(roomId, newlyJoinedPlayers); // gateway에 알림
    }

    if (isJoined) {
      this.logger.info(
        { clientId: client.id, ...payload },
        'Client Joined Game.',
      );
      return 'ok';
    }

    this.logger.info(
      { clientId: client.id, ...payload },
      'Client Pushed Waiting queue',
    );

    client.emit(ClientEvents.ROOM_METADATA, room);
    client.emit(ClientEvents.USER_WAITLIST, {
      roomId,
      currentRound: room.currentRound,
      totalRounds: room.settings.totalRounds,
      phase: room.phase,
    });

    return 'ok';
  }

  @SubscribeMessage(ServerEvents.ROOM_SETTINGS)
  async updateSettings(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomSettingsDto,
  ): Promise<string> {
    const { roomId, maxPlayer, totalRounds, drawingTime } = payload;
    const room = await this.gameService.updateGameSettings(
      roomId,
      client.id,
      maxPlayer,
      totalRounds,
      drawingTime,
    );

    if (!room) {
      return 'ok';
    }

    this.broadcastMetadata(room);

    this.logger.info(
      { clientId: client.id, ...payload },
      'User Updated Room Settings',
    );
    return 'ok';
  }

  @SubscribeMessage(ServerEvents.ROOM_START)
  async startGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomStartDto,
  ): Promise<string> {
    const { roomId } = payload;
    try {
      await this.gameService.startGame(roomId, client.id);
      this.logger.info({ clientId: client.id, ...payload }, 'Game Started');
    } catch (err) {
      this.logger.error(err);
      if (err instanceof InternalError) {
        throw new WebsocketException(err.message);
      }
      if (err instanceof WebsocketException) {
        throw err;
      }
      throw new WebsocketException(ErrorCode.INTERNAL_ERROR);
    }
    return 'ok';
  }

  @SubscribeMessage(ServerEvents.ROOM_RESTART)
  async restartGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomStartDto,
  ): Promise<string> {
    const { roomId } = payload;
    await this.gameService.restartGame(roomId, client.id);

    this.logger.info({ clientId: client.id, ...payload }, 'Game Restarted');
    return 'ok';
  }

  @SubscribeMessage(ServerEvents.USER_KICK)
  async kickUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UserKickDto,
  ): Promise<string> {
    const { roomId, targetPlayerId } = payload;
    try {
      const { room, kickedPlayer } = await this.gameService.kickUser(
        roomId,
        client.id,
        targetPlayerId,
      );

      this.server
        .to(targetPlayerId)
        .emit(ClientEvents.ROOM_KICKED, { roomId, kickedPlayer });
      this.broadcastMetadata(room);

      const targetPlayerSocket =
        this.server.sockets.sockets.get(targetPlayerId);
      if (targetPlayerSocket) {
        await targetPlayerSocket.leave(roomId);
      }

      // 강퇴 시스템 메시지
      const kickMsg = await this.chatService.createKickMessage(
        roomId,
        kickedPlayer.nickname,
      );
      this.chatGateway.broadcastSystemMessage(roomId, kickMsg);

      this.server
        .to(roomId)
        .emit(ClientEvents.ROOM_KICKED, { roomId, kickedPlayer });
      this.broadcastMetadata(room);

      this.logger.info({ clientId: client.id, ...payload }, 'User Kicked');
    } catch (err) {
      this.logger.error(err);
      if (err instanceof InternalError) {
        throw new WebsocketException(err.message);
      }
      throw err;
    }
    return 'ok';
  }

  @SubscribeMessage(ServerEvents.USER_PRACTICE)
  async startPractice(@ConnectedSocket() client: Socket) {
    const randomPrompt = await this.gameService.startPractice();
    client.emit(ClientEvents.USER_PRACTICE_STARTED, randomPrompt);
  }

  broadcastMetadata(room: GameRoom) {
    this.server.to(room.roomId).emit(ClientEvents.ROOM_METADATA, room);
  }

  private async syncCurrentPhaseData(client: Socket, room: GameRoom) {
    try {
      const data = await this.gameService.getSyncData(room.roomId);
      if (!data) return;

      switch (room.phase) {
        case GamePhase.ROUND_REPLAY:
          client.emit(ClientEvents.ROOM_ROUND_REPLAY, data);
          break;
        case GamePhase.ROUND_STANDING:
          client.emit(ClientEvents.ROOM_ROUND_STANDING, data);
          break;
        case GamePhase.GAME_END:
          client.emit(ClientEvents.ROOM_GAME_END, data);
          break;
      }
    } catch (err) {
      this.logger.error(err);
    }
  }
}
