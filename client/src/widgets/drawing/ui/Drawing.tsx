import { RankingPanel } from '@/entities/drawing';
import { useGameStore } from '@/entities/gameRoom/model';
import { Timer } from '@/entities/timer';
import { DrawingCanvas } from '@/features/drawingCanvas';
import { LiveRankingList } from '@/features/liveRanking';
import { GameHeader } from '@/shared/ui';

export const Drawing = () => {
  const currentRound = useGameStore((state) => state.currentRound);

  return (
    <>
      <Timer />
      <div className="page-center">
        <main className="game-container">
          <GameHeader
            title="그림을 그려주세요!"
            round={currentRound}
            showDecoration
            showLogo={false}
          />

          <div className="flex min-h-0 flex-1 items-stretch justify-center gap-6">
            <div className="canvas-wrapper">
              <DrawingCanvas />
            </div>

            <div className="flex h-full">
              <RankingPanel>
                <LiveRankingList />
              </RankingPanel>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};
