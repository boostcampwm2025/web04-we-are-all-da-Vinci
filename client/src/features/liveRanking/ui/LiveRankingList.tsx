import { RankingCard } from '@/entities/ranking';
import { PLAYER_COLORS } from '../config/playerColors';
import { useLiveRanking } from '../model/useLiveRanking';

const EmptyRankingPlaceholder = () => (
  <div className="flex flex-1 items-center justify-center text-gray-400">
    <div className="text-center">
      <span className="material-symbols-outlined mb-2 text-4xl">
        leaderboard
      </span>
      <p className="font-handwriting text-sm">
        그림을 그리면 랭킹이 표시됩니다
      </p>
    </div>
  </div>
);

export const LiveRankingList = () => {
  const { rankings } = useLiveRanking();

  if (rankings.length === 0) {
    return <EmptyRankingPlaceholder />;
  }

  return (
    <>
      {rankings.map((entry, index) => (
        <RankingCard
          key={entry.socketId}
          rank={entry.rank}
          nickname={entry.nickname}
          percent={Math.round(entry.similarity)}
          rankChange={entry.rankChange}
          isCurrentUser={entry.isCurrentUser}
          color={PLAYER_COLORS[index % PLAYER_COLORS.length]}
        />
      ))}
    </>
  );
};
