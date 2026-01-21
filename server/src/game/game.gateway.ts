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
import { ClientEvents, ServerEvents } from 'src/common/constants';
import { PinoLogger } from 'nestjs-pino';
import { GameService } from './game.service';
import { GameRoom } from 'src/common/types';
import { UseFilters } from '@nestjs/common';
import { WebsocketExceptionFilter } from 'src/common/exceptions/websocket-exception.filter';
import { UserKickDto } from './dto/user-kick.dto';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [],
    credentials: true,
  },
})
@UseFilters(WebsocketExceptionFilter)
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly logger: PinoLogger,
    private readonly gameService: GameService,
  ) {
    this.logger.setContext(GameGateway.name);
  }

  handleConnection(client: Socket) {
    this.logger.info({ clientId: client.id }, 'New User Connected');
  }

  async handleDisconnect(client: Socket) {
    this.logger.info({ clientId: client.id }, 'User Disconnected');

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
    const { nickname, roomId } = payload;
    const room = await this.gameService.joinRoom(roomId, nickname, client.id);
    if (room) {
      this.logger.info(
        { clientId: client.id, ...payload },
        'Client Joined Game.',
      );

      await client.join(room.roomId);
      this.broadcastMetadata(room);
    } else {
      this.logger.info(
        { clientId: client.id, ...payload },
        'Client Pushed Waiting queue',
      );
      client.emit(ClientEvents.USER_WAITLIST, { roomId });
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
      .to(roomId)
      .emit(ClientEvents.ROOM_KICKED, { roomId, kickedPlayer });
    this.broadcastMetadata(updatedRoom);

    this.logger.info({ clientId: client.id, ...payload }, 'User Kicked');
    return 'ok';
  }

  broadcastMetadata(room: GameRoom) {
    this.server.to(room.roomId).emit(ClientEvents.ROOM_METADATA, room);
  }
}
