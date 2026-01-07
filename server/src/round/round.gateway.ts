import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ClientEvents, ServerEvents } from 'src/common/constants';
import { RoundService } from './round.service';
import { PinoLogger } from 'nestjs-pino';
import { UserDrawingDto } from 'src/play/dto/user-drawing.dto';
import { RoomGameEndDto } from './dto/room-game-end.dto';
import { RoomRoundEndDto } from './dto/room-round-end.dto';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [],
    credentials: true,
  },
})
export class RoundGateway {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly logger: PinoLogger,
    private readonly roundService: RoundService,
  ) {
    this.logger.setContext(RoundGateway.name);
  }

  async startRound(roomId: string, round: number) {
    const roundStartResult = await this.roundService.startRound(roomId, round);

    this.server
      .to(roomId)
      .emit(ClientEvents.ROOM_METADATA, roundStartResult.room);
    this.server.to(roomId).emit(ClientEvents.ROOM_PROMPT, {
      promptStrokes: roundStartResult.promptStrokes,
    });
  }

  @SubscribeMessage(ServerEvents.USER_DRAWING)
  async endRound(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UserDrawingDto,
  ) {
    const roomId = payload.roomId;
    const room = await this.roundService.endRound(roomId);

    // 임시 라운드 결과값
    const roundResult: RoomRoundEndDto = {
      rankings: [],
      promptStrokes: [],
    };

    this.server.to(roomId).emit(ClientEvents.ROOM_METADATA, room);
    this.server.to(roomId).emit(ClientEvents.ROOM_ROUND_END, roundResult);

    setTimeout(() => {
      void (async () => {
        if (room.currentRound >= room.settings.totalRounds) {
          // 게임 종료 로직
          // 임시 결과값
          const finalResult: RoomGameEndDto = {
            finalRankings: [],
            highlight: {
              promptStrokes: [],
              playerStrokes: [],
              similarity: 0,
            },
          };
          this.server.to(roomId).emit(ClientEvents.ROOM_GAME_END, finalResult);
          return;
        }

        // 최대 라운드 도달하지 않았다면 다음 라운드 시작
        const nextRound = room.currentRound + 1;
        await this.startRound(roomId, nextRound);
      })();
    }, 10000);
  }
}
