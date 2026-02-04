import { OnModuleInit, UseFilters, UseInterceptors } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { PinoLogger } from 'nestjs-pino';
import { Server, Socket } from 'socket.io';
import { ClientEvents, GamePhase, ServerEvents } from '../common/constants';
import { getSocketCorsOrigin } from 'src/common/config/cors.util';
import { WebsocketExceptionFilter } from 'src/common/exceptions/websocket-exception.filter';
import { MetricInterceptor } from 'src/common/interceptors/metric.interceptor';
import { GameRoom, Player } from 'src/common/types';
import { escapeHtml } from 'src/common/utils/sanitize';
import { ChatGateway } from 'src/chat/chat.gateway';
import { ChatService } from 'src/chat/chat.service';
import { MetricService } from 'src/metric/metric.service';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { PlayerCacheService } from 'src/redis/cache/player-cache.service';
import {
  UserJoinSchema,
  RoomSettingsSchema,
  RoomStartSchema,
  UserKickSchema,
} from '@shared/types';
import { GameService } from './game.service';

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
    private readonly playerCacheService: PlayerCacheService,
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

    // 퇴장 전 플레이어 정보 조회
    const roomId = await this.playerCacheService.getRoomId(client.id);
    let leavingPlayer = null;
    if (roomId) {
      const players = await this.gameRoomCacheService.getAllPlayers(roomId);
      leavingPlayer = players.find((p) => p.socketId === client.id);
    }

    const room = await this.gameService.leaveRoom(client.id);

    if (!room) {
      return;
    }

    // 퇴장 시스템 메시지
    if (leavingPlayer) {
      const leaveMsg = await this.chatService.createLeaveMessage(
        room.roomId,
        leavingPlayer.nickname,
      );
      this.chatGateway.broadcastSystemMessage(room.roomId, leaveMsg);
    }

    // 빈 방이면 삭제 + 채팅 정리
    if (room.players.length === 0) {
      await this.gameRoomCacheService.deleteRoom(room.roomId);
      await this.chatService.clearHistory(room.roomId);
      return;
    }

    this.broadcastMetadata(room);
  }

  @SubscribeMessage(ServerEvents.USER_JOIN)
  async joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ): Promise<string> {
    const parsed = UserJoinSchema.safeParse(payload);
    if (!parsed.success) {
      throw new WsException(parsed.error.message);
    }
    const { roomId, profileId, nickname: rawNickname } = parsed.data;
    const nickname = escapeHtml(rawNickname.trim());
    const room = await this.gameService.joinRoom(
      roomId,
      nickname,
      profileId,
      client.id,
    );

    // 소켓 룸에는 항상 입장
    await client.join(roomId);

    if (!room) {
      this.logger.info(
        { clientId: client.id, roomId, nickname, profileId },
        'Client Pushed Waiting queue',
      );

      const currentRoom = await this.gameService.getRoom(roomId);
      if (!currentRoom) {
        return 'ok';
      }
      client.emit(ClientEvents.ROOM_METADATA, currentRoom);
      client.emit(ClientEvents.USER_WAITLIST, {
        roomId,
        currentRound: currentRoom.currentRound,
        totalRounds: currentRoom.settings.totalRounds,
        phase: currentRoom.phase,
      });
    } else {
      this.logger.info(
        { clientId: client.id, roomId, nickname, profileId },
        'Client Joined Game.',
      );
    }

    return 'ok';
  }

  @SubscribeMessage(ServerEvents.ROOM_SETTINGS)
  async updateSettings(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ): Promise<string> {
    const parsed = RoomSettingsSchema.safeParse(payload);
    if (!parsed.success) {
      throw new WsException(parsed.error.message);
    }
    const { roomId, maxPlayer, totalRounds, drawingTime } = parsed.data;
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
      { clientId: client.id, roomId, maxPlayer, totalRounds, drawingTime },
      'User Updated Room Settings',
    );
    return 'ok';
  }

  @SubscribeMessage(ServerEvents.ROOM_START)
  async startGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ): Promise<string> {
    const parsed = RoomStartSchema.safeParse(payload);
    if (!parsed.success) {
      throw new WsException(parsed.error.message);
    }
    const { roomId } = parsed.data;
    await this.gameService.startGame(roomId, client.id);

    this.logger.info({ clientId: client.id, roomId }, 'Game Started');
    return 'ok';
  }

  @SubscribeMessage(ServerEvents.ROOM_RESTART)
  async restartGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ): Promise<string> {
    const parsed = RoomStartSchema.safeParse(payload);
    if (!parsed.success) {
      throw new WsException(parsed.error.message);
    }
    const { roomId } = parsed.data;
    await this.gameService.restartGame(roomId, client.id);

    this.logger.info({ clientId: client.id, roomId }, 'Game Restarted');
    return 'ok';
  }

  @SubscribeMessage(ServerEvents.USER_KICK)
  async kickUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ): Promise<string> {
    const parsed = UserKickSchema.safeParse(payload);
    if (!parsed.success) {
      throw new WsException(parsed.error.message);
    }
    const { roomId, targetPlayerId } = parsed.data;
    const { updatedRoom, kickedPlayer } = await this.gameService.kickUser(
      roomId,
      client.id,
      targetPlayerId,
    );

    this.server
      .to(targetPlayerId)
      .emit(ClientEvents.ROOM_KICKED, { roomId, kickedPlayer });
    this.broadcastMetadata(updatedRoom);

    const targetPlayerSocket = this.server.sockets.sockets.get(targetPlayerId);
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
    this.broadcastMetadata(updatedRoom);

    this.logger.info(
      { clientId: client.id, roomId, targetPlayerId },
      'User Kicked',
    );
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
  }
}
