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
import { EVENT } from './game.constants';
import { JoinRoomDto } from './dto/join-room.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { StartGameDto } from './dto/start-game.dto';

@WebSocketGateway()
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket, ...args: any[]) {}

  handleDisconnect(client: Socket) {}

  @SubscribeMessage(EVENT.USER_JOIN)
  joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomDto,
  ): string {
    return 'ok';
  }

  @SubscribeMessage(EVENT.ROOM_SETTINGS)
  updateSettings(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UpdateSettingsDto,
  ): string {
    return 'ok';
  }

  @SubscribeMessage(EVENT.ROOM_START)
  startGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: StartGameDto,
  ): string {
    return 'ok';
  }
}
