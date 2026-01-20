import { Timer } from '@/entities/timer';
import { RoundBadge } from '@/shared/ui/round';
import { GameStartHeader, ImagePreviewCard } from '@/entities/gameStart';
import { useGameStore } from '@/entities/gameRoom/model';

export const Prompt = () => {
  const promptStrokes = useGameStore((state) => state.promptStrokes);
  const currentRound = useGameStore((state) => state.currentRound);

  return (
    <>
      <Timer />

      <div className="page-center">
        <div className="flex h-full w-full max-w-3xl flex-col">
          <GameStartHeader
            roundBadge={<RoundBadge round={currentRound} />}
            title="기억하세요!"
          />

          <div className="content-wrapper">
            <ImagePreviewCard promptStrokes={promptStrokes} />
          </div>
        </div>
      </div>
    </>
  );
};
