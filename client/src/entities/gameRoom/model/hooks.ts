import type { Player } from '@/entities/player/model';
import type { PlayerScore } from '@/entities/roundResult';
import { useGameStore } from './gameStore';
import { selectPlayers } from './selectors';

// Helper: 현재 플레이어 찾기 (스토어의 mySocketId 기반)
export const useCurrentPlayer = (): Player | null => {
  const players = useGameStore(selectPlayers);
  const mySocketId = useGameStore((state) => state.mySocketId);

  if (!mySocketId) return null;

  return players.find((p) => p.socketId === mySocketId) || null;
};

// Helper: 호스트 여부 확인
export const useIsHost = (): boolean => {
  const currentPlayer = useCurrentPlayer();
  return currentPlayer?.isHost ?? false;
};

// Helper: 특정 socketId가 현재 유저인지 확인
export const useIsCurrentUser = (socketId: string): boolean => {
  const mySocketId = useGameStore((state) => state.mySocketId);

  return mySocketId === socketId;
};

// Helper: 현재 플레이어의 등수 계산 (displayResults 기준)
export const useMyRank = (displayResults: PlayerScore[]): number => {
  const currentPlayer = useCurrentPlayer();

  if (!currentPlayer) return -1;

  const index = displayResults.findIndex(
    (p) => p.socketId === currentPlayer.socketId,
  );

  return index !== -1 ? index + 1 : -1;
};
