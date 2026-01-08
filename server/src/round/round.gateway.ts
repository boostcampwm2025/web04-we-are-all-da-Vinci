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
import { RoomPromptDto } from './dto/room-prompt.dto';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';

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
    private readonly cacheService: GameRoomCacheService,
  ) {
    this.logger.setContext(RoundGateway.name);
  }

  @SubscribeMessage(ServerEvents.USER_DRAWING)
  async handleDrawingSubmit(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UserDrawingDto,
  ) {
    const roomId = payload.roomId;
    const room = await this.cacheService.getRoom(roomId);

    if (!room) {
      this.logger.error({ roomId }, 'Room not found');
      return;
    }

    // DRAWING -> ROUND_END
    const result = await this.roundService.nextPhase(room);
    const roundResult = result as RoomRoundEndDto;

    this.server.to(roomId).emit(ClientEvents.ROOM_METADATA, room);
    this.server.to(roomId).emit(ClientEvents.ROOM_ROUND_END, roundResult);

    // 10초 후 다음 라운드 또는 게임 종료
    setTimeout(() => {
      void (async () => {
        const updatedRoom = await this.cacheService.getRoom(roomId);
        if (!updatedRoom) {
          return;
        }

        // ROUND_END -> PROMPT (다음 라운드) 또는 GAME_END
        const nextResult = await this.roundService.nextPhase(updatedRoom);

        // 게임 종료인지 확인
        if ('finalRankings' in nextResult) {
          const gameEndResult = nextResult as RoomGameEndDto;
          this.server.to(roomId).emit(ClientEvents.ROOM_METADATA, updatedRoom);
          this.server
            .to(roomId)
            .emit(ClientEvents.ROOM_GAME_END, gameEndResult);
        } else {
          // 다음 라운드 시작 (PROMPT)
          const promptResult = nextResult as RoomPromptDto;
          this.server.to(roomId).emit(ClientEvents.ROOM_METADATA, updatedRoom);
          this.server.to(roomId).emit(ClientEvents.ROOM_PROMPT, promptResult);

          // 5초 후 PROMPT -> DRAWING으로 전환
          setTimeout(() => {
            void (async () => {
              const drawingRoom = await this.cacheService.getRoom(roomId);
              if (!drawingRoom) {
                return;
              }

              // PROMPT -> DRAWING
              await this.roundService.nextPhase(drawingRoom);
              this.server
                .to(roomId)
                .emit(ClientEvents.ROOM_METADATA, drawingRoom);
            })();
          }, 5000);
        }
      })();
    }, 10000);
  }
}
