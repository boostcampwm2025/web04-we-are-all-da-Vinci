import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { LeaderboardCacheService } from 'src/redis/cache/leaderboard-cache.service';

@Injectable()
export class PlayService {
  constructor(
    private readonly leaderboardCacheService: LeaderboardCacheService,
    private readonly cacheService: GameRoomCacheService,
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

    const players = await this.cacheService.getPlayers(roomId);
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

    this.logger.debug({ rankings, players, leaderboard });

    return rankings;
  }
}
