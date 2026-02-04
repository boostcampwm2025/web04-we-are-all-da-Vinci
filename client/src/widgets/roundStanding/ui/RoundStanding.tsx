import { useMyRank } from '@/entities/gameRoom';
import { StandingRow } from '@/entities/ranking';
import { Timer } from '@/entities/timer';
import { GameHeader } from '@/shared/ui';
import { getRankMessage } from '../lib/getRankMessage';
import { useRoundStanding } from '../model/useRoundStanding';

export const RoundStanding = () => {
  const {
    displayResults,
    isSorted,
    currentRound,
    previousScoreMap,
    setRowRef,
  } = useRoundStanding();

  const myRank = useMyRank(displayResults);
  const rankMessage = getRankMessage(myRank);

  return (
    <>
      <Timer />

      <div className="page-center">
        <main className="game-container">
          <GameHeader title="현재 순위" round={currentRound} showLogo={false} />

          <div className="mb-4 min-h-14 text-center">
            {isSorted && rankMessage && (
              <p className="font-handwriting animate-bounce text-2xl font-bold text-blue-600 transition-opacity duration-500">
                {rankMessage}
              </p>
            )}
          </div>

          <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 overflow-y-auto p-3 pl-10 md:pl-20">
            {displayResults.map((player, index) => (
              <div key={player.socketId} ref={setRowRef(player.socketId)}>
                <StandingRow
                  player={player}
                  previousScore={previousScoreMap.get(player.socketId) ?? 0}
                  finalRank={index + 1}
                  isSorted={isSorted}
                />
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
};
