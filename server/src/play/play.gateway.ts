import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { UserScoreDto } from './dto/user-score.dto';
import { UserDrawingDto } from './dto/user-drawing.dto';
import { ServerEvents } from 'src/core/game.constants';

@WebSocketGateway()
export class PlayGateway {
  @SubscribeMessage(ServerEvents.USER_SCORE)
  updateScore(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UserScoreDto,
  ) {
    return 'ok';
  }

  @SubscribeMessage(ServerEvents.USER_DRAWING)
  submitDrawing(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UserDrawingDto,
  ) {
    return 'ok';
  }
}
