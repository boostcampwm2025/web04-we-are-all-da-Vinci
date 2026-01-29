import { useGameStore } from '@/entities/gameRoom';
import { ImagePreviewCard } from '@/entities/gameStart';
import { DrawingCanvas } from '@/features/drawingCanvas';
import { GameHeader } from '@/shared/ui';
import { useState } from 'react';

export const Practice = () => {
  const [similarity, setSimilarity] = useState(0);

  const practicePrompt = useGameStore((state) => state.practicePrompt);
  const setIsPracticing = useGameStore((state) => state.setIsPracticing);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="game-container scribble-border scribble-border-box relative w-full max-w-6xl bg-white p-10">
        <GameHeader
          title="연습 모드"
          description="기다리는 동안 그림 감각을 익혀보세요!"
          showLogo={false}
        />

        <div className="relative flex min-h-0 gap-2 overflow-hidden rounded-2xl bg-white/5">
          <ImagePreviewCard promptStrokes={practicePrompt || []} />
          <DrawingCanvas
            isPractice
            practicePrompt={practicePrompt}
            onSimilarityChange={setSimilarity}
          />
        </div>
        <div className="text-content-secondary font-handwriting text-right text-3xl">
          유사도 점수: {similarity}점
        </div>

        <div className="absolute top-6 right-6">
          <span
            className="material-symbols-outlined absolute top-1 right-1 cursor-pointer text-base hover:text-red-500 sm:top-2 sm:right-2 sm:text-lg lg:text-xl"
            onClick={() => setIsPracticing(false)}
          >
            close
          </span>
        </div>
      </div>
    </div>
  );
};
