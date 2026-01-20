import { Timer } from '@/entities/timer';
import { RoundBadge } from '@/shared/ui';
import { GameStartHeader, ImagePreviewCard } from '@/entities/gameStart';
import { useGameStore } from '@/entities/gameRoom/model';

export const Prompt = () => {
  const promptStrokes = useGameStore((state) => state.promptStrokes);
  const currentRound = useGameStore((state) => state.currentRound);

  return (
    <>
      <Timer />

      <div className="page-center h-screen">
        <div className="page-container">
          <GameStartHeader
            roundBadge={<RoundBadge round={currentRound} />}
            title="기억하세요!"
          />

          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="canvas-wrapper">
              <ImagePreviewCard promptStrokes={promptStrokes} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
