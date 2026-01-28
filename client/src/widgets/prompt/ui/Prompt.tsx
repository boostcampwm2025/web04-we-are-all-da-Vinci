import { Timer } from '@/entities/timer';

import { useGameStore } from '@/entities/gameRoom/model';
import { ImagePreviewCard } from '@/entities/gameStart';
import { GameHeader } from '@/shared/ui';

export const Prompt = () => {
  const promptStrokes = useGameStore((state) => state.promptStrokes);
  const currentRound = useGameStore((state) => state.currentRound);

  return (
    <>
      <Timer />

      <div className="page-center">
        <main className="game-container">
          <GameHeader
            title="기억하세요!"
            round={currentRound}
            showDecoration
            showLogo={false}
          />

          <div className="flex min-h-0 items-center justify-center md:flex-1">
            <div className="canvas-wrapper">
              <ImagePreviewCard promptStrokes={promptStrokes} />
            </div>
          </div>
        </main>
      </div>
    </>
  );
};
