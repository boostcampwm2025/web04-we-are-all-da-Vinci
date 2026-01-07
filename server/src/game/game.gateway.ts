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
  updateSettings(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomSettingsDto,
  ): string {
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
    this.logger.info({ clientId: client.id, ...payload }, 'Game Started');

    const { roomId } = payload;
    const promptStrokes = await this.gameService.startGame(roomId);
    const room = await this.gameService.getRoom(roomId);

    if (room) {
      this.broadcastMetadata(room);
      this.server.to(roomId).emit(ClientEvents.ROOM_PROMPT, {
        promptStrokes: promptStrokes,
      });
    }

    return 'ok';
  }

  broadcastMetadata(room: GameRoom) {
    this.server.to(room.roomId).emit(ClientEvents.ROOM_METADATA, room);
  }
}
