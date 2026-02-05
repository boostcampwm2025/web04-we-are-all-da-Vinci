import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { GamePhase } from '../common/constants';
import { ErrorCode } from 'src/common/constants/error-code';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';
import { Similarity, Stroke } from 'src/common/types';
import { createPlayerMapper } from 'src/common/utils/player.utils';
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
    const players = await this.cacheService.getAllPlayers(roomId);
    if (!players) {
      this.logger.error('게임 방 데이터 오류');
      throw new WebsocketException('서버 오류');
    }

    // socketId로 플레이어를 찾아 profileId 획득
    const player = players.find((p) => p.socketId === socketId);
    if (!player) {
      throw new WebsocketException(ErrorCode.PLAYER_NOT_IN_ROOM);
    }

    await this.leaderboardCacheService.updateScore(
      roomId,
      player.profileId,
      similarity,
    );

    const playerMapper = createPlayerMapper(players, 'profileId');

    const leaderboard = await this.leaderboardCacheService.getAll(roomId);

    const rankings = leaderboard.map(({ value, score }) => ({
      profileId: value,
      similarity: score,
      nickname: playerMapper[value]?.nickname,
      socketId: playerMapper[value]?.socketId,
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

    const player = room.players.find((p) => p.socketId === socketId);
    if (!player) {
      throw new WebsocketException(ErrorCode.PLAYER_NOT_IN_ROOM);
    }

    const currentRound = room.currentRound;

    // profileId 기반으로 저장
    await this.progressCacheService.submitRoundResult(
      roomId,
      currentRound,
      player.profileId,
      strokes,
      similarity,
    );

    await this.standingsCacheService.updateScore(
      roomId,
      player.profileId,
      similarity,
    );
  }
}
