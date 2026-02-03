import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserScoreSchema, UserDrawingSchema } from '@shared/types';
import { ClientEvents, ServerEvents } from '../common/constants';
import { PinoLogger } from 'nestjs-pino';
import { UseFilters, UseInterceptors } from '@nestjs/common';
import { WebsocketExceptionFilter } from 'src/common/exceptions/websocket-exception.filter';
import { PlayService } from './play.service';
import { getSocketCorsOrigin } from 'src/common/config/cors.util';
import { MetricInterceptor } from 'src/common/interceptors/metric.interceptor';

@WebSocketGateway({
  cors: {
    origin: getSocketCorsOrigin(),
    credentials: true,
  },
})
@UseFilters(WebsocketExceptionFilter)
@UseInterceptors(MetricInterceptor)
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
  async updateScore(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ) {
    const { roomId, similarity } = UserScoreSchema.parse(payload);

    const rankings = await this.playService.updateScore(
      roomId,
      client.id,
      similarity,
    );
    this.server.to(roomId).emit(ClientEvents.ROOM_LEADERBOARD, { rankings });

    this.logger.info(
      { clientId: client.id, roomId, similarity },
      'User Updated Score',
    );
    return 'ok';
  }

  @SubscribeMessage(ServerEvents.USER_DRAWING)
  async submitDrawing(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ) {
    const { roomId, strokes, similarity } = UserDrawingSchema.parse(payload);
    this.logger.info({ clientId: client.id, roomId }, 'User Submitted Drawing');
    await this.playService.submitDrawing(
      roomId,
      client.id,
      similarity,
      strokes,
    );

    return 'ok';
  }
}
