import {
  PlayerReplaysSection,
  PromptSection,
  RoundResultHeader,
} from '@/entities/roundResult';
import { Timer } from '@/entities/timer';
import { useGameStore } from '@/entities/gameRoom/model';
import { useEffect } from 'react';
import { SoundManager } from '@/shared/lib/sound/soundManager';

export const RoundEnd = () => {
  const roundResults = useGameStore((state) => state.roundResults);
  const currentRound = useGameStore((state) => state.currentRound);
  const promptStrokes = useGameStore((state) => state.promptStrokes);

  useEffect(() => {
    const manager = SoundManager.getInstance();
    manager.playSound('roundEnd');
  }, []);

  return (
    <>
      <Timer />
      <div className="page-center h-screen">
        <div className="page-container">
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
