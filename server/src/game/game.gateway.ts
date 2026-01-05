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
import { JoinRoomDto } from './dto/user-join.dto';
import { UpdateSettingsDto } from './dto/room-settings.dto';
import { StartGameDto } from './dto/room-start.dto';
import { ServerEvents } from 'src/core/game.constants';

@WebSocketGateway()
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket, ...args: any[]) {}

  handleDisconnect(client: Socket) {}

  @SubscribeMessage(ServerEvents.USER_JOIN)
  joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomDto,
  ): string {
    return 'ok';
  }

  @SubscribeMessage(ServerEvents.ROOM_SETTINGS)
  updateSettings(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UpdateSettingsDto,
  ): string {
    return 'ok';
  }

  @SubscribeMessage(ServerEvents.ROOM_START)
  startGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: StartGameDto,
  ): string {
    return 'ok';
  }
}
