import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { UserScoreDto } from './dto/user-score.dto';
import { UserDrawingDto } from './dto/user-drawing.dto';
import { ServerEvents } from 'src/common/constants';
import { PinoLogger } from 'nestjs-pino';

@WebSocketGateway()
export class PlayGateway {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(PlayGateway.name);
  }

  @SubscribeMessage(ServerEvents.USER_SCORE)
  updateScore(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UserScoreDto,
  ) {
    this.logger.info({ clientId: client.id, ...payload }, 'User Updated Score');
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
