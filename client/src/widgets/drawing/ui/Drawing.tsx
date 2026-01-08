import { Timer } from '@/entities/timer';
import { RankingCard } from '@/entities/ranking';
import { DrawingHeader, RankingPanel } from '@/entities/drawing';
import { DrawingCanvas } from '@/features/drawingCanvas';
import { RoundBadge } from '@/shared/ui/round';

export const Drawing = () => {
  return (
    <>
      <Timer />
      <div className="flex h-screen w-full items-center justify-center px-4 py-4">
        <div className="flex h-full w-full max-w-7xl flex-col">
          <DrawingHeader
            title="그림을 그려주세요!"
            roundBadge={<RoundBadge round={1} />}
          />

          <div className="flex min-h-0 flex-1 items-center justify-center gap-6">
            <div className="aspect-square h-full">
              <DrawingCanvas />
            </div>

            <div className="h-full">
              <RankingPanel>
                <RankingCard
                  rank={1}
                  icon="account_circle"
                  nickname="User 1"
                  percent={82}
                  color="blue"
                />
                <RankingCard
                  rank={2}
                  icon="account_circle"
                  nickname="Player 2"
                  percent={45}
                  color="yellow"
                />
                <RankingCard
                  rank={3}
                  icon="account_circle"
                  nickname="Player 3"
                  percent={12}
                  color="purple"
                />
              </RankingPanel>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
