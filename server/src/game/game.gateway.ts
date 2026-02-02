import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserJoinDto } from './dto/user-join.dto';
import { RoomSettingsDto } from './dto/room-settings.dto';
import { RoomStartDto } from './dto/room-start.dto';
import { ClientEvents, GamePhase, ServerEvents } from '../common/constants';
import { PinoLogger } from 'nestjs-pino';
import { GameService } from './game.service';
import { GameRoom, Player } from 'src/common/types';
import { OnModuleInit, UseFilters, UseInterceptors } from '@nestjs/common';
import { WebsocketExceptionFilter } from 'src/common/exceptions/websocket-exception.filter';
import { UserKickDto } from './dto/user-kick.dto';
import { getSocketCorsOrigin } from 'src/common/config/cors.util';
import { MetricInterceptor } from 'src/common/interceptors/metric.interceptor';
import { MetricService } from 'src/metric/metric.service';

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
        await this.syncCurrentPhaseData(socket, room);
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

    const room = await this.gameService.leaveRoom(client.id);

    if (!room) {
      return;
    }
    this.broadcastMetadata(room);
  }

  @SubscribeMessage(ServerEvents.USER_JOIN)
  async joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UserJoinDto,
  ): Promise<string> {
    const { nickname, roomId, profileId } = payload;
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
        { clientId: client.id, ...payload },
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
        { clientId: client.id, ...payload },
        'Client Joined Game.',
      );
    }

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
    await this.gameService.startGame(roomId, client.id);

    this.logger.info({ clientId: client.id, ...payload }, 'Game Started');
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

    this.server
      .to(roomId)
      .emit(ClientEvents.ROOM_KICKED, { roomId, kickedPlayer });
    this.broadcastMetadata(updatedRoom);

    this.logger.info({ clientId: client.id, ...payload }, 'User Kicked');
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
