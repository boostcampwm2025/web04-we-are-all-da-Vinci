import { Injectable } from '@nestjs/common';
import { GamePhase } from 'src/common/constants';
import { ErrorCode } from 'src/common/constants/error-code';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';
import { Player } from 'src/common/types';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { LeaderboardCacheService } from 'src/redis/cache/leaderboard-cache.service';
import { PlayerCacheService } from 'src/redis/cache/player-cache.service';
import { WaitlistCacheService } from 'src/redis/cache/waitlist-cache.service';

@Injectable()
export class WaitlistService {
  constructor(
    private readonly waitlistCache: WaitlistCacheService,
    private readonly gameRoomCache: GameRoomCacheService,
    private readonly playerCache: PlayerCacheService,
    private readonly leaderboardCache: LeaderboardCacheService,
  ) {}

  async requestJoinRoom(
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

    return await this.getNewlyJoinedUserFromWaitlist(roomId);
  }

  async deleteWaitPlayer(roomId: string, socketId: string) {
    await this.waitlistCache.deleteWaitPlayer(roomId, socketId);
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

  async isRoomFull(roomId: string, maxPlayer: number, currentPlayers: number) {
    const waitlistSize = await this.waitlistCache.getWaitlistSize(roomId);
    return maxPlayer <= currentPlayers + waitlistSize;
  }
}
