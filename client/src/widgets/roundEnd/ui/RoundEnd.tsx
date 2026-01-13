import { RankingCard, type PlayerColor } from '@/entities/ranking';
import {
  NextRoundIndicator,
  PlayerDrawingCard,
  RankingList,
  ReferenceImageCard,
  RoundResultHeader,
} from '@/entities/roundResult';
import { Timer } from '@/entities/timer';
import { useGameStore } from '@/entities/gameRoom/model';

const COLORS: PlayerColor[] = [
  'yellow',
  'indigo',
  'red',
  'green',
  'purple',
  'blue',
  'gray',
];

export const RoundEnd = () => {
  const roundResults = useGameStore((state) => state.roundResults);
  const currentRound = useGameStore((state) => state.currentRound);
  const settings = useGameStore((state) => state.settings);

  // 1위 플레이어
  const topPlayer = roundResults[0];

  return (
    <>
      <Timer />
      <div className="flex h-screen w-full items-center justify-center px-4 py-4">
        <div className="flex h-full w-full max-w-5xl flex-col">
          <RoundResultHeader title="Round Results" />

          <div className="flex min-h-0 flex-1 gap-4">
            <ReferenceImageCard
              playerName={topPlayer?.nickname ?? '-'}
              rank={1}
            />

            <PlayerDrawingCard similarity={topPlayer?.similarity ?? 0} />

            <div className="flex w-72 flex-col gap-3">
              <NextRoundIndicator
                currentRound={currentRound}
                totalRounds={settings.totalRounds}
              />

              <RankingList>
                {roundResults.map((player, index) => (
                  <RankingCard
                    key={player.socketId}
                    rank={index + 1}
                    nickname={player.nickname}
                    percent={player.similarity}
                    color={COLORS[index % COLORS.length]}
                  />
                ))}
              </RankingList>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
