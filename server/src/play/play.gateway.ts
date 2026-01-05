import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { EVENT } from 'src/game/game.constants';
import { UpdateScoreDto } from './dto/update-score.dto';
import { SubmitDrawingDto } from './dto/submit-drawing.dto';

@WebSocketGateway()
export class PlayGateway {
  @SubscribeMessage(EVENT.USER_SCORE)
  updateScore(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UpdateScoreDto,
  ) {
    return 'ok';
  }

  @SubscribeMessage(EVENT.USER_DRAWING)
  submitDrawing(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubmitDrawingDto,
  ) {
    return 'ok';
  }
}
