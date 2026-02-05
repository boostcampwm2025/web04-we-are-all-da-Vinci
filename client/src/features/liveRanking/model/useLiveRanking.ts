import { selectLiveRankings, useGameStore } from '@/entities/gameRoom';
import { RANK_CHANGE, type RankChange } from '@/entities/ranking';

function calculateRankChange(
  previousRank: number | null,
  currentRank: number,
): RankChange {
  if (previousRank === null) return RANK_CHANGE.NEW;
  if (previousRank > currentRank) return RANK_CHANGE.UP;
  if (previousRank < currentRank) return RANK_CHANGE.DOWN;
  return RANK_CHANGE.SAME;
}

export const useLiveRanking = () => {
  const rankings = useGameStore(selectLiveRankings);
  const myProfileId = useGameStore((state) => state.myProfileId);

  const rankingsWithChange = rankings.map((entry) => ({
    ...entry,
    rankChange: calculateRankChange(entry.previousRank, entry.rank),
    isCurrentUser: entry.profileId === myProfileId,
  }));

  return { rankings: rankingsWithChange };
};
