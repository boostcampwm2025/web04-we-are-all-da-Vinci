import {
  PlayerReplaysSection,
  PromptSection,
  RoundResultHeader,
} from '@/entities/roundResult';
import { Timer } from '@/entities/timer';
import { useGameStore } from '@/entities/gameRoom/model';

export const RoundEnd = () => {
  const roundResults = useGameStore((state) => state.roundResults);
  const currentRound = useGameStore((state) => state.currentRound);
  const promptStrokes = useGameStore((state) => state.promptStrokes);

  return (
    <>
      <Timer />
      <div className="flex h-screen w-full flex-col px-4 py-4">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-4">
            <RoundResultHeader title={`라운드 ${currentRound} 결과`} />
          </div>
          <div className="flex min-h-0 flex-1 gap-4">
            <PromptSection promptStrokes={promptStrokes} />
            <PlayerReplaysSection players={roundResults} />
          </div>
        </div>
      </div>
    </>
  );
};
