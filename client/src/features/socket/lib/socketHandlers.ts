import type { GameRoom } from '@/entities/gameRoom';
import type { RankingEntry } from '@/entities/ranking';
import type { Phase } from '@/shared/config';

// 서버에서 오는 랭킹 데이터 타입
export interface ServerRankingEntry {
  socketId: string;
  nickname: string;
  profileId: string;
  similarity: number;
}

/**
 * 서버 랭킹 데이터를 이전 순위 정보와 함께 클라이언트 랭킹으로 변환한다.
 *
 * @param serverData - 서버에서 받은 랭킹 배열 (유사도 내림차순 정렬됨)
 * @param currentRankings - 현재 클라이언트에 저장된 랭킹 (이전 순위 참조용)
 * @returns 이전 순위가 포함된 클라이언트 랭킹 배열
 */
export const buildRankings = (
  serverData: ServerRankingEntry[],
  currentRankings: RankingEntry[],
): RankingEntry[] => {
  const prevMap = new Map(currentRankings.map((r) => [r.profileId, r.rank]));

  return serverData.map((entry, index) => ({
    socketId: entry.socketId,
    nickname: entry.nickname,
    profileId: entry.profileId,
    similarity: entry.similarity,
    rank: index + 1,
    previousRank: prevMap.get(entry.profileId) ?? null,
  }));
};

export interface RoomMetadataResult {
  shouldResetGameData: boolean;
  isJoined: boolean;
  roomUpdate: Partial<GameRoom>;
}

/**
 * 서버에서 받은 방 메타데이터를 분석하여 스토어 업데이트에 필요한 정보를 반환한다.
 *
 * - GAME_END → WAITING 전환 시 게임 데이터 초기화 플래그 설정
 * - 현재 유저의 참가 여부에 따라 페이즈 업데이트 방식 결정
 *
 * @param data - 서버에서 받은 방 메타데이터
 * @param currentPhase - 클라이언트의 현재 페이즈
 * @param myProfileId - 현재 유저의 프로필 ID
 * @returns 스토어 업데이트에 필요한 판단 결과
 */
export const processRoomMetadata = (
  data: GameRoom,
  currentPhase: Phase,
  myProfileId: string,
): RoomMetadataResult => {
  const shouldResetGameData =
    currentPhase === 'GAME_END' && data.phase === 'WAITING';

  const isJoined = data.players.some((p) => p.profileId === myProfileId);

  const roomUpdate: Partial<GameRoom> = {
    roomId: data.roomId,
    players: data.players,
    phase: isJoined ? data.phase : currentPhase,
    currentRound: data.currentRound,
    settings: data.settings,
  };

  return { shouldResetGameData, isJoined, roomUpdate };
};
