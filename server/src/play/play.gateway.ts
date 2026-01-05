import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { UpdateScoreDto } from './dto/update-score.dto';
import { SubmitDrawingDto } from './dto/submit-drawing.dto';
import { ServerEvents } from 'src/core/game.constants';

@WebSocketGateway()
export class PlayGateway {
  @SubscribeMessage(ServerEvents.USER_SCORE)
  updateScore(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UpdateScoreDto,
  ) {
    return 'ok';
  }

  @SubscribeMessage(ServerEvents.USER_DRAWING)
  submitDrawing(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubmitDrawingDto,
  ) {
    return 'ok';
  }
}
