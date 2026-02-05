import { Injectable } from '@nestjs/common';
import { GamePhase } from 'src/common/constants';
import { ErrorCode } from 'src/common/constants/error-code';
import { InternalError } from 'src/common/exceptions/internal-error';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';
import { Player } from 'src/common/types';
import { GameProgressCacheService } from 'src/redis/cache/game-progress-cache.service';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { GracePeriodCacheService } from 'src/redis/cache/grace-period-cache.service';
import { LeaderboardCacheService } from 'src/redis/cache/leaderboard-cache.service';
import { PlayerCacheService } from 'src/redis/cache/player-cache.service';
import { StandingsCacheService } from 'src/redis/cache/standings-cache.service';
import { WaitlistCacheService } from 'src/redis/cache/waitlist-cache.service';

export interface LeaveRoomResult {
  player: Player;
  isGracePeriod: boolean;
}

@Injectable()
export class PlayerService {
  constructor(
    private readonly waitlistCache: WaitlistCacheService,
    private readonly gameRoomCache: GameRoomCacheService,
    private readonly playerCache: PlayerCacheService,
    private readonly leaderboardCache: LeaderboardCacheService,
    private readonly standingCache: StandingsCacheService,
    private readonly progressCache: GameProgressCacheService,
    private readonly gracePeriodCache: GracePeriodCacheService,
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
      await this.leaderboardCache.updateScore(roomId, newPlayer.profileId, 0);

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

  /**
   * 플레이어 퇴장 처리
   * GAME_END를 제외한 모든 페이즈에서 Grace Period를 설정하여
   * 새로고침 시 세션 복구 가능하게 함
   */
  async leaveRoom(
    roomId: string,
    socketId: string,
    phase: string,
  ): Promise<LeaveRoomResult | null> {
    const players = await this.gameRoomCache.getAllPlayers(roomId);

    const player = players.find((player) => player.socketId === socketId);

    if (!player) {
      // 대기자일 수 있으니 대기열 제거 처리
      await this.leaveWaitlist(roomId, socketId);
      return null;
    }

    // GAME_END가 아닌 모든 페이즈: Grace Period 설정 (WAITING 포함)
    const shouldUseGracePeriod = phase !== GamePhase.GAME_END;

    if (shouldUseGracePeriod) {
      // Grace Period 설정 (2초 TTL)
      await this.gracePeriodCache.set(roomId, player.profileId, socketId);

      // 플레이어 데이터는 유지, playerCache만 삭제
      // (복구 시 updatePlayerSocketByProfileId로 socketId만 교체)
      await this.playerCache.delete(socketId);

      return { player, isGracePeriod: true };
    }

    // GAME_END: 즉시 완전 삭제
    await Promise.all([
      this.gameRoomCache.deletePlayer(roomId, socketId),
      this.playerCache.delete(socketId),
      this.leaderboardCache.delete(roomId, player.profileId),
      this.progressCache.deletePlayer(roomId, player.profileId),
      this.standingCache.delete(roomId, player.profileId),
    ]);

    return { player, isGracePeriod: false };
  }

  async isHost(roomId: string, socketId: string) {
    const players = await this.gameRoomCache.getAllPlayers(roomId);

    const player = players.find((p) => p.socketId === socketId);

    if (!player) {
      throw new InternalError(ErrorCode.PLAYER_NOT_FOUND);
    }
    return player.isHost;
  }

  checkIsHost(players: Player[], socketId: string) {
    const player = players.find((p) => p.socketId === socketId);

    if (!player) {
      throw new InternalError(ErrorCode.PLAYER_NOT_FOUND);
    }
    return player.isHost;
  }

  async getPlayers(roomId: string) {
    return await this.gameRoomCache.getAllPlayers(roomId);
  }

  /**
   * 세션 복구 시도 (새로고침 대응)
   * profileId로 기존 플레이어를 찾아 socketId만 교체
   *
   * @returns 복구 성공 시 기존 플레이어 정보, 실패 시 null
   */
  async tryRecoverSession(
    roomId: string,
    profileId: string,
    newSocketId: string,
    nickname: string,
    phase: string,
  ): Promise<{ player: Player; oldSocketId: string } | null> {
    // Grace Period 확인
    const gracePeriodData = await this.gracePeriodCache.get(roomId, profileId);
    if (!gracePeriodData) {
      return null;
    }

    const { oldSocketId } = gracePeriodData;

    // 플레이어 socketId 교체
    const updated = await this.gameRoomCache.updatePlayerSocketByProfileId(
      roomId,
      profileId,
      newSocketId,
      nickname,
    );

    if (!updated) {
      return null;
    }

    // player 캐시 갱신
    await this.playerCache.set(newSocketId, roomId);

    // profileId 기반이므로 leaderboard/standings 교체 불필요
    // (이미 profileId로 저장되어 있음)

    // DRAWING 단계 복귀 시: 다시 그림을 제출할 수 있도록 기존 제출 삭제
    if (phase === GamePhase.DRAWING) {
      const room = await this.gameRoomCache.getRoom(roomId);
      if (room) {
        await this.leaderboardCache.updateScore(roomId, profileId, 0);
        await this.progressCache.deleteRoundResult(
          roomId,
          room.currentRound,
          profileId,
        );
      }
    }

    // Grace Period 삭제 (복구 완료)
    await this.gracePeriodCache.delete(roomId, profileId);

    // 복구된 플레이어 정보 반환
    const player = await this.gameRoomCache.findPlayerByProfileId(
      roomId,
      profileId,
    );

    return player ? { player, oldSocketId } : null;
  }
}
