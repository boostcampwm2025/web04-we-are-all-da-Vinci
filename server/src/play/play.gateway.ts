import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserScoreDto } from './dto/user-score.dto';
import { UserDrawingDto } from './dto/user-drawing.dto';
import { ClientEvents, ServerEvents } from 'src/common/constants';
import { PinoLogger } from 'nestjs-pino';
import { UseFilters } from '@nestjs/common';
import { WebsocketExceptionFilter } from 'src/common/exceptions/websocket-exception.filter';
import { PlayService } from './play.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [],
    credentials: true,
  },
})
@UseFilters(WebsocketExceptionFilter)
export class PlayGateway {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly logger: PinoLogger,
    private readonly playService: PlayService,
  ) {
    this.logger.setContext(PlayGateway.name);
  }

  @SubscribeMessage(ServerEvents.USER_SCORE)
  updateScore(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UserScoreDto,
  ) {
    const { roomId, similarity } = payload;
    this.logger.info(
      { clientId: client.id, roomId, similarity },
      'User Updated Score',
    );

    const rankings = this.playService.updateScore(
      roomId,
      client.id,
      similarity,
    );
    this.server.to(roomId).emit(ClientEvents.ROOM_LEADERBOARD, { rankings });
    return 'ok';
  }

  @SubscribeMessage(ServerEvents.USER_DRAWING)
  submitDrawing(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UserDrawingDto,
  ) {
    this.logger.info(
      { clientId: client.id, ...payload },
      'User Submitted Drawing',
    );
    return 'ok';
  }
}
