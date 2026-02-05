import { useState } from 'react';
import { WaitingSkeleton } from '@/widgets/waiting/ui/WaitingSkeleton';
import { RoundStandingSkeleton } from '@/widgets/roundStanding/ui/RoundStandingSkeleton';
import { RoundReplaySkeleton } from '@/widgets/roundReplay/ui/RoundReplaySkeleton';
import { GameEndSkeleton } from '@/widgets/gameEnd/ui/GameEndSkeleton';
import type { Phase } from '@/shared/config';

export const GameLoadingSkeleton = () => {
  const [phase] = useState<Phase | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('last_game_phase') as Phase | null;
    }
    return null;
  });

  if (phase === 'ROUND_STANDING') {
    return <RoundStandingSkeleton />;
  }

  if (phase === 'ROUND_REPLAY') {
    return <RoundReplaySkeleton />;
  }

  if (phase === 'GAME_END') {
    return <GameEndSkeleton />;
  }

  // 기본값 (WAITING, DRAWING, PROMPT 등은 대기방 UI와 유사하거나 대기방으로 돌아가는 흐름)
  return <WaitingSkeleton />;
};
