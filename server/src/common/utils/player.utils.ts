import { Player } from '../types';
import { WebsocketException } from '../exceptions/websocket-exception';
import { ErrorCode } from '../constants/error-code';

/**
 * players 배열에서 socketId로 플레이어를 찾아 반환합니다.
 * 플레이어가 없으면 WebsocketException을 throw합니다.
 */
export function findPlayerOrThrow(players: Player[], socketId: string): Player {
  const player = players.find((p) => p.socketId === socketId);
  if (!player) {
    throw new WebsocketException(ErrorCode.PLAYER_NOT_FOUND);
  }
  return player;
}

/**
 * 플레이어가 호스트인지 검증합니다.
 * 호스트가 아니면 WebsocketException을 throw합니다.
 */
export function requireHost(player: Player): void {
  if (!player.isHost) {
    throw new WebsocketException(ErrorCode.PLAYER_NOT_HOST);
  }
}

/**
 * 플레이어 목록을 socketId를 키로 하는 맵으로 변환합니다.
 * @param players 플레이어 배열
 * @returns socketId -> { nickname, profileId } 매핑 객체
 */
export function createPlayerMapper(
  players: Player[],
): Record<string, { nickname: string; profileId: string }> {
  return players.reduce(
    (prev, player) => ({
      ...prev,
      [player.socketId]: {
        nickname: player.nickname,
        profileId: player.profileId,
      },
    }),
    {},
  );
}
