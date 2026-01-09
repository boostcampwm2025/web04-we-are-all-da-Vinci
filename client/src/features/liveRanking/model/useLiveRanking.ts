import { useGameStore, selectLiveRankings } from '@/entities/gameRoom/model';
import { getSocket } from '@/shared/api/socket';
import type { RankChange } from '@/entities/ranking';

function calculateRankChange(
  previousRank: number | null,
  currentRank: number,
): RankChange {
  if (previousRank === null) return 'new';
  if (previousRank > currentRank) return 'up';
  if (previousRank < currentRank) return 'down';
  return 'same';
}

export const useLiveRanking = () => {
  const rankings = useGameStore(selectLiveRankings);
  const socket = getSocket();
  const mySocketId = socket?.id;

  const rankingsWithChange = rankings.map((entry) => ({
    ...entry,
    rankChange: calculateRankChange(entry.previousRank, entry.rank),
    isCurrentUser: entry.socketId === mySocketId,
  }));

  return { rankings: rankingsWithChange };
};
