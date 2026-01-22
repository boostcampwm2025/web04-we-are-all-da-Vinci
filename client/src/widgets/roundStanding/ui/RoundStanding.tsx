import { Timer } from '@/entities/timer';
import { RoundBadge } from '@/shared/ui';
import { DrawingHeader } from '@/entities/drawing';
import { StandingRow } from '@/entities/ranking';
import { useRoundStanding } from '../model/useRoundStanding';
import { useMyRank } from '@/entities/gameRoom/model';
import { getRankMessage } from '../lib/getRankMessage';

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

      <div className="page-center h-screen">
        <div className="page-container">
          <DrawingHeader
            title="현재 순위"
            roundBadge={<RoundBadge round={currentRound} />}
          />

          {isSorted && rankMessage && (
            <div className="mb-4 text-center">
              <p className="font-handwriting animate-bounce text-2xl font-bold text-blue-600 transition-opacity duration-500">
                {rankMessage}
              </p>
            </div>
          )}

          <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 overflow-y-auto p-3 pl-20">
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
        </div>
      </div>
    </>
  );
};
