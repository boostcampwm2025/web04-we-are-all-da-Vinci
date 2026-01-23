import { useGameStore } from '@/entities/gameRoom/model';
import { PlayerReplaysSection, PromptSection } from '@/entities/roundResult';
import { Timer } from '@/entities/timer';
import { SOUND_LIST } from '@/shared/config/sound';
import { SoundManager } from '@/shared/lib';
import { GameHeader } from '@/shared/ui';
import { useEffect } from 'react';

export const RoundReplay = () => {
  const roundResults = useGameStore((state) => state.roundResults);
  const currentRound = useGameStore((state) => state.currentRound);
  const promptStrokes = useGameStore((state) => state.promptStrokes);

  useEffect(() => {
    const manager = SoundManager.getInstance();
    manager.playSound(SOUND_LIST.ROUND_END);
  }, []);

  return (
    <>
      <Timer />
      <div className="page-center">
        <main className="game-container">
          <GameHeader title={`라운드 ${currentRound} 결과`} showDecoration />
          <div className="flex min-h-0 flex-1 gap-4">
            <PromptSection promptStrokes={promptStrokes} />
            <PlayerReplaysSection players={roundResults} />
          </div>
        </main>
      </div>
    </>
  );
};
