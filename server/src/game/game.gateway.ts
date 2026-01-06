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
import { ServerEvents } from 'src/common/constants';
import { PinoLogger } from 'nestjs-pino';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [],
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(GameGateway.name);
  }

  handleConnection(client: Socket) {
    this.logger.info({ clientId: client.id }, 'New User Connected');
  }

  handleDisconnect(client: Socket) {
    this.logger.info({ clientId: client.id }, 'User Disconnected');
  }

  @SubscribeMessage(ServerEvents.USER_JOIN)
  joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UserJoinDto,
  ): string {
    this.logger.info(
      { clientId: client.id, ...payload },
      'Client Joined Game.',
    );
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
  startGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomStartDto,
  ): string {
    this.logger.info({ clientId: client.id, ...payload }, 'Game Started');
    return 'ok';
  }
}
