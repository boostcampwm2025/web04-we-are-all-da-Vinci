import { StaticCanvas } from '@/entities/drawing';
import { DrawingReplayCanvas } from '@/features/replayingCanvas';
import type { Highlight } from '../model/types';

interface PotgCardProps {
  highlight: Highlight | null;
  totalRounds: number;
  nickname?: string;
}

const PotgCard = ({ highlight, totalRounds, nickname }: PotgCardProps) => {
  return (
    <div className="card font-handwriting paper-shadow flex h-full w-full flex-col overflow-hidden p-4">
      <div className="border-stroke-default text-content-tertiary mb-2 flex shrink-0 items-center justify-between border-b border-dashed px-6 py-3">
        <div className="flex items-center gap-2 text-2xl font-bold">
          <span className="material-symbols-outlined text-accent-bright">
            leaderboard
          </span>
          오늘의 다빈치 POTG!!
        </div>
        <div className="flex items-end">
          <span className="text-lg">총 {totalRounds} 라운드</span>
        </div>
      </div>
      {highlight && (
        <div className="flex justify-center pb-2">
          <div className="animate-glow text-accent-bright mt-8 text-3xl font-bold">
            ✨ 유사도 {highlight.similarity.similarity.toFixed(2)}% ✨
          </div>
        </div>
      )}

      {highlight ? (
        <div className="flex min-h-0 flex-1 flex-col items-center gap-2">
          <div className="flex min-h-0 w-full flex-1 items-center justify-center gap-4 py-2 lg:gap-8">
            {/* 제시 이미지 */}
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <p className="text-content-tertiary text-lg font-bold">
                제시 이미지
              </p>
              <div className="border-stroke-muted bg-surface-base flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border-4 p-4 shadow-md">
                <StaticCanvas
                  strokes={highlight.promptStrokes}
                  className="h-full w-full"
                />
              </div>
            </div>

            {/* 1등 그림 */}
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <p className="text-content-tertiary text-lg font-bold">
                1등 그림
              </p>
              <div className="border-rank-gold bg-surface-base flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border-4 p-4 shadow-xl">
                <DrawingReplayCanvas
                  strokes={highlight.playerStrokes}
                  speed={30}
                  loop={true}
                  className="h-full w-full"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 pb-4">
            {nickname && (
              <div className="text-content-primary text-4xl font-bold">
                👑 {nickname} 👑
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <p className="text-content-disabled py-10 text-center text-xl">
            리플레이 없음
          </p>
        </div>
      )}
    </div>
  );
};
export default PotgCard;
