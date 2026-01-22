import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { GamePhase } from 'src/common/constants';
import { ErrorCode } from 'src/common/constants/error-code';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';
import { Similarity, Stroke } from 'src/common/types';
import { GameProgressCacheService } from 'src/redis/cache/game-progress-cache.service';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { LeaderboardCacheService } from 'src/redis/cache/leaderboard-cache.service';
import { StandingsCacheService } from 'src/redis/cache/standings-cache.service';

@Injectable()
export class PlayService {
  constructor(
    private readonly leaderboardCacheService: LeaderboardCacheService,
    private readonly cacheService: GameRoomCacheService,
    private readonly progressCacheService: GameProgressCacheService,
    private readonly standingsCacheService: StandingsCacheService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PlayService.name);
  }

  async updateScore(roomId: string, socketId: string, similarity: number) {
    await this.leaderboardCacheService.updateScore(
      roomId,
      socketId,
      similarity,
    );

    const players = await this.cacheService.getAllPlayers(roomId);
    if (!players) {
      this.logger.error('게임 방 데이터 오류');
      throw new WebsocketException('서버 오류');
    }

    const idNicknameMapper: Record<string, string> = players.reduce(
      (prev, player) => ({
        ...prev,
        [player.socketId]: player.nickname,
      }),
      {},
    );

    const leaderboard = await this.leaderboardCacheService.getAll(roomId);

    const rankings = leaderboard.map(({ value, score }) => ({
      socketId: value,
      similarity: score,
      nickname: idNicknameMapper[value],
    }));

    return rankings;
  }

  async submitDrawing(
    roomId: string,
    socketId: string,
    similarity: Similarity,
    strokes: Stroke[],
  ) {
    const room = await this.cacheService.getRoom(roomId);

    if (!room) {
      throw new WebsocketException(ErrorCode.ROOM_NOT_FOUND);
    }

    if (room.phase !== GamePhase.DRAWING) {
      throw new WebsocketException(ErrorCode.GAME_NOT_DRAWING_PHASE);
    }

    if (!room.players.find((player) => player.socketId === socketId)) {
      throw new WebsocketException(ErrorCode.PLAYER_NOT_IN_ROOM);
    }

    const currentRound = room.currentRound;

    await this.progressCacheService.submitRoundResult(
      roomId,
      currentRound,
      socketId,
      strokes,
      similarity,
    );

    await this.standingsCacheService.updateScore(roomId, socketId, similarity);
  }
}
