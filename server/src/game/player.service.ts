import { Injectable } from '@nestjs/common';
import { GamePhase } from 'src/common/constants';
import { ErrorCode } from 'src/common/constants/error-code';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';
import { Player } from 'src/common/types';
import { GameProgressCacheService } from 'src/redis/cache/game-progress-cache.service';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { LeaderboardCacheService } from 'src/redis/cache/leaderboard-cache.service';
import { PlayerCacheService } from 'src/redis/cache/player-cache.service';
import { WaitlistCacheService } from 'src/redis/cache/waitlist-cache.service';

@Injectable()
export class PlayerService {
  constructor(
    private readonly waitlistCache: WaitlistCacheService,
    private readonly gameRoomCache: GameRoomCacheService,
    private readonly playerCache: PlayerCacheService,
    private readonly leaderboardCache: LeaderboardCacheService,
    private readonly progressCache: GameProgressCacheService,
  ) {}

  async requestJoinWaitList(
    roomId: string,
    socketId: string,
    nickname: string,
    profileId: string,
  ) {
    await this.waitlistCache.addWaitPlayer(roomId, {
      socketId,
      nickname,
      profileId,
      isHost: false,
    });

    await this.playerCache.set(socketId, roomId);

    return await this.getNewlyJoinedUserFromWaitlist(roomId);
  }

  // 대기열 관리: 대기열에서 참여할 플레이어 리스트 반환
  async getNewlyJoinedUserFromWaitlist(roomId: string): Promise<Player[]> {
    const room = await this.gameRoomCache.getRoom(roomId);
    if (!room) {
      throw new WebsocketException(ErrorCode.ROOM_NOT_FOUND);
    }

    // prompt, drawing 단계에서는 대기 유지
    if (room.phase === GamePhase.PROMPT || room.phase === GamePhase.DRAWING) {
      return [];
    }

    const newlyJoinedPlayers: Player[] = [];

    // 이외 phase에서는 참여
    while (true) {
      const newPlayer =
        await this.gameRoomCache.popAndAddPlayerAtomically(roomId);
      if (!newPlayer) break;

      await this.playerCache.set(newPlayer.socketId, roomId);
      await this.leaderboardCache.updateScore(roomId, newPlayer.socketId, 0);

      newlyJoinedPlayers.push(newPlayer);
    }

    return newlyJoinedPlayers;
  }

  async getJoinedRoomId(socketId: string) {
    return await this.playerCache.getRoomId(socketId);
  }

  async isRoomFull(roomId: string, maxPlayer: number, currentPlayers: number) {
    const waitlistSize = await this.waitlistCache.getWaitlistSize(roomId);
    return maxPlayer <= currentPlayers + waitlistSize;
  }

  async leaveWaitlist(roomId: string, socketId: string) {
    await Promise.all([
      this.waitlistCache.deleteWaitPlayer(roomId, socketId),
      this.playerCache.delete(socketId),
    ]);
  }

  async leaveRoom(roomId: string, socketId: string) {
    const players = await this.gameRoomCache.getAllPlayers(roomId);

    const player = players.find((player) => player.socketId === socketId);

    if (!player) {
      // 대기자일 수 있으니 대기열 제거 처리
      await this.leaveWaitlist(roomId, socketId);
      return null;
    }

    await Promise.all([
      this.gameRoomCache.deletePlayer(roomId, socketId),
      this.playerCache.delete(socketId),
      this.leaderboardCache.delete(roomId, socketId),
      this.progressCache.deletePlayer(roomId, socketId),
    ]);

    return player;
  }
}
