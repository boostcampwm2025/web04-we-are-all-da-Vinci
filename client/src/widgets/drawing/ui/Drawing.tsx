import { DrawingHeader, RankingPanel } from '@/entities/drawing';
import { useGameStore } from '@/entities/gameRoom/model';
import { Timer } from '@/entities/timer';
import { DrawingCanvas } from '@/features/drawingCanvas';
import { LiveRankingList } from '@/features/liveRanking';
import { RoundBadge } from '@/shared/ui/round';

export const Drawing = () => {
  const currentRound = useGameStore((state) => state.currentRound);

  return (
    <>
      <Timer />
      <div className="flex h-screen w-full items-center justify-center px-4 py-4">
        <div className="flex h-full w-full max-w-7xl flex-col">
          <DrawingHeader
            title="그림을 그려주세요!"
            roundBadge={<RoundBadge round={currentRound} />}
          />

          <div className="flex min-h-0 flex-1 items-stretch justify-center gap-6">
            <div className="aspect-square h-full">
              <DrawingCanvas />
            </div>

            <div className="flex h-full">
              <RankingPanel>
                <LiveRankingList />
              </RankingPanel>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
