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
import { GamePlayService } from './game-play.service';
import { getCorsOrigins } from 'src/utils';
import { RoomState } from './game-play.types';

@WebSocketGateway({
  transports: ['websocket'],
  cors: {
    origin: getCorsOrigins(process.env.CORS_ORIGIN),
    credentials: true,
  },
})
export class GamePlayGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly gamePlayService: GamePlayService) {}

  handleConnection(client: Socket) {}

  handleDisconnect(client: Socket) {
    const rid = this.gamePlayService.leave(client.id);
    if (rid) this.broadcastLeaderboard(rid);
  }

  @SubscribeMessage('room:join')
  joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string },
  ) {
    // TODO: 임시 roomId, 삭제 필요
    const roomId = 'room-1';
    const { userId } = payload;

    const rid = this.gamePlayService.join(roomId, client.id, userId);
    client.join(rid);
    this.broadcastLeaderboard(rid);
  }

  @SubscribeMessage('drawing:start')
  startGame(@ConnectedSocket() client: Socket) {
    const roomId = 'room-1';

    const res = this.gamePlayService.startGame(roomId, client.id);
    if (!res.ok) {
      this.server.to(client.id).emit('error', { message: res.message });
      return;
    }

    // ✅ 게임 시작 알림은 broadcastLeaderboard로 전파
    this.broadcastLeaderboard(roomId);
  }

  @SubscribeMessage('score:update')
  updateScore(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string; score: number },
  ) {
    const roomId = 'room-1';
    const { score } = payload;
    this.gamePlayService.updateScore(roomId, client.id, score);

    this.broadcastLeaderboard(roomId);
  }

  @SubscribeMessage('drawing:result')
  submitDrawingResult(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { userId: string; score: number; drawing: number[][] },
  ) {
    const roomId = 'room-1';
    const { score, drawing } = payload;

    const res = this.gamePlayService.submitDrawingResult(
      roomId,
      client.id,
      score,
      drawing,
    );

    if (res.roundEnd) {
      // 1) ENDED 전환
      this.gamePlayService.endRound(roomId);

      // 2) 상태 전파(ENDED) - 요구사항: broadcastLeaderboard 사용
      this.broadcastLeaderboard(roomId);

      // 3) 결과 화면 전파(개별 랭크/드로잉)
      this.broadcastRoundEnd(roomId);

      // 4) 10초 후 WAITING 복귀 스케줄 + 복귀 시점에도 상태 전파
      this.gamePlayService.scheduleResetToWaiting(roomId, 10_000);

      setTimeout(() => {
        // 방이 존재하고, 서비스가 ENDED -> WAITING으로 바꾼 경우를 FE에 반영
        // (서비스 내부에서 ENDED가 아니면 리셋하지 않도록 막아두었음)
        this.broadcastLeaderboard(roomId);
      }, 10_000);
    }
  }

  private broadcastLeaderboard(roomId: string) {
    const room = this.gamePlayService.getRoom(roomId);
    const players = this.gamePlayService
      .getPlayers(roomId)
      .sort((a, b) => b.score - a.score);

    const roomState = room?.state ?? 'WAITING';

    const data: {
      userId: string;
      score: number;
      isHost: boolean;
      rank: number;
      roomState: RoomState;
    }[] = [];

    for (let i = 0; i < players.length; ++i) {
      const p = players[i];
      const payload: {
        userId: string;
        score: number;
        isHost: boolean;
        rank: number;
        roomState: RoomState;
      } = {
        userId: p.userId,
        score: p.score,
        isHost: p.isHost,
        rank: i + 1,
        roomState,
      };

      data.push(payload);
    }

    for (const p of players) {
      this.server.to(p.id).emit('leaderboard:update', { players: data });
    }
  }

  private broadcastRoundEnd(roomId: string) {
    const players = this.gamePlayService
      .getPlayers(roomId)
      .sort((a, b) => b.score - a.score);

    const data: {
      userId: string;
      score: number;
      rank: number;
      drawing: number[][];
    }[] = [];

    for (let i = 0; i < players.length; ++i) {
      const p = players[i];
      const payload: {
        userId: string;
        score: number;
        rank: number;
        drawing: number[][];
      } = {
        userId: p.userId,
        score: p.score,
        rank: i + 1,
        drawing: p.drawing,
      };
      data.push(payload);
    }

    for (const p of players) {
      this.server.to(p.id).emit('round:end', { results: data });
    }
  }
}
