import { RankingCard } from '@/entities/ranking';
import {
  RoundResultHeader,
  ReferenceImageCard,
  PlayerDrawingCard,
  NextRoundIndicator,
  RankingList,
} from '@/entities/roundResult';

export const RoundEnd = () {
  const rankings = [
    {
      rank: 1,
      nickname: 'User 1 (You)',
      score: 92,
      color: 'yellow' as const,
    },
    {
      rank: 2,
      nickname: 'Player 2',
      score: 78,
      color: 'indigo' as const,
    },
    {
      rank: 3,
      nickname: 'Player 3',
      score: 45,
      color: 'red' as const,
    },
    {
      rank: 4,
      nickname: 'Player 4',
      score: 0,
      color: 'yellow' as const,
    },
  ];

  const totalRounds = 10;

  return (
    <>
      <div className="flex h-screen w-full items-center justify-center px-4 py-4">
        <div className="flex h-full w-full max-w-5xl flex-col">
          <RoundResultHeader title="Round Results" />

          <div className="flex min-h-0 flex-1 gap-4">
            <ReferenceImageCard playerName="User 1" rank={1} />

            <PlayerDrawingCard similarity={92} />

            <div className="flex w-72 flex-col gap-3">
              <NextRoundIndicator
                currentRound={totalRounds}
                totalRounds={totalRounds}
              />

              <RankingList>
                {rankings.map((player) => (
                  <RankingCard
                    key={player.rank}
                    rank={player.rank}
                    nickname={player.nickname}
                    percent={player.score}
                    color={player.color}
                  />
                ))}
              </RankingList>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
