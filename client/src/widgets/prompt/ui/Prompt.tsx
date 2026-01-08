import { Timer } from '@/entities/timer';
import { RoundBadge } from '@/shared/ui/round';
import { GameStartHeader, ImagePreviewCard } from '@/entities/gameStart';

export const Prompt = () => {
  return (
    <>
      <Timer />

      <div className="flex h-full w-full items-center justify-center px-4 py-4">
        <div className="flex h-full w-full max-w-3xl flex-col">
          <GameStartHeader
            roundBadge={<RoundBadge round={1} />}
            title="기억하세요!"
          />

          <div className="flex min-h-0 flex-1 items-center justify-center">
            <ImagePreviewCard />
          </div>
        </div>
      </div>
    </>
  );
};
