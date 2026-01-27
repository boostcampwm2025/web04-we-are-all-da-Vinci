import { StaticCanvas } from '@/entities/drawing';
import { PlayerSimilarityDetailTooltip } from '@/entities/similarity';
import { DrawingReplayCanvas } from '@/features/replayingCanvas';
import { useState } from 'react';
import type { Highlight } from '../model/types';

interface PotgCardProps {
  highlight: Highlight | null;
  totalRounds: number;
}

const PotgCard = ({ highlight, totalRounds }: PotgCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="card-lg flex h-full w-full flex-col overflow-y-auto">
      <div className="border-stroke-default mb-4 flex shrink-0 items-center justify-between border-b border-dashed pb-2">
        <div className="font-handwriting text-content-primary text-2xl">
          <span className="material-symbols-outlined text-rank-gold mr-1 align-middle">
            leaderboard
          </span>
          1등 POTG!!
        </div>
        <span className="text-content-tertiary text-sm">
          총 라운드: {totalRounds}
        </span>
      </div>

      {highlight ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6">
          <div
            className="relative shrink-0"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <p className="font-handwriting text-content-secondary cursor-pointer text-4xl underline transition-colors hover:text-indigo-600">
              유사도: {highlight.similarity.similarity.toFixed(2)}%
            </p>
            {isHovered && (
              <div className="absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2">
                <PlayerSimilarityDetailTooltip
                  similarity={highlight.similarity}
                />
              </div>
            )}
          </div>

          <div className="flex min-h-0 w-full flex-1 items-center justify-center gap-8">
            {/* 제시 이미지 */}
            <div className="flex aspect-square h-full max-h-[400px] flex-col">
              <p className="text-content-tertiary mb-2 text-center text-lg font-bold">
                제시 이미지
              </p>
              <div className="border-stroke-muted bg-surface-base flex aspect-square w-full flex-1 items-center justify-center overflow-hidden rounded-2xl border-4 p-4 shadow-md">
                <StaticCanvas
                  strokes={highlight.promptStrokes}
                  className="h-full w-full"
                />
              </div>
            </div>

            {/* 1등 그림 */}
            <div className="flex aspect-square h-full max-h-[400px] flex-col">
              <p className="text-content-tertiary mb-2 text-center text-lg font-bold">
                1등 그림
              </p>
              <div className="border-rank-gold bg-surface-base flex aspect-square w-full flex-1 items-center justify-center overflow-hidden rounded-2xl border-4 p-4 shadow-xl">
                <DrawingReplayCanvas
                  strokes={highlight.playerStrokes}
                  speed={30}
                  loop={true}
                  className="h-full w-full"
                />
              </div>
            </div>
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
