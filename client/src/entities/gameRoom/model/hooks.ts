import type { Player } from '@shared/types';
import type { PlayerScore } from '@/entities/roundResult';
import { useGameStore } from './gameStore';
import { selectPlayers } from './selectors';

// Helper: 현재 플레이어 찾기 (profileId 기반)
export const useCurrentPlayer = (): Player | null => {
  const players = useGameStore(selectPlayers);
  const myProfileId = useGameStore((state) => state.myProfileId);

  if (!myProfileId) return null;

  return players.find((p) => p.profileId === myProfileId) || null;
};

// Helper: 호스트 여부 확인
export const useIsHost = (): boolean => {
  const currentPlayer = useCurrentPlayer();
  return currentPlayer?.isHost ?? false;
};

// Helper: 특정 profileId가 현재 유저인지 확인
export const useIsCurrentUser = (profileId: string): boolean => {
  const myProfileId = useGameStore((state) => state.myProfileId);
  return myProfileId === profileId;
};

// Helper: 현재 플레이어의 등수 계산 (displayResults 기준)
export const useMyRank = (displayResults: PlayerScore[]): number => {
  const currentPlayer = useCurrentPlayer();

  if (!currentPlayer) return -1;

  const index = displayResults.findIndex(
    (p) => p.profileId === currentPlayer.profileId,
  );

  return index !== -1 ? index + 1 : -1;
};
