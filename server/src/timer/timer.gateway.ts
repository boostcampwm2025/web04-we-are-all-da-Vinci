import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { TimerService } from './timer.service';
import { PinoLogger } from 'nestjs-pino';
import { ClientEvents } from '../common/constants';
import { OnModuleInit } from '@nestjs/common';
import { getSocketCorsOrigin } from 'src/common/config/cors.util';

@WebSocketGateway({
  cors: {
    origin: getSocketCorsOrigin(),
    credentials: true,
  },
})
export class TimerGateway implements OnModuleInit {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly timerService: TimerService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(TimerGateway.name);
  }

  onModuleInit() {
    // TimerService에 콜백 등록
    this.timerService.setOnTimerTick((roomId: string, timeLeft: number) => {
      this.broadcastTimer(roomId, timeLeft);
    });
  }

  private broadcastTimer(roomId: string, timeLeft: number) {
    this.server.to(roomId).emit(ClientEvents.ROOM_TIMER, { timeLeft });
  }
}
