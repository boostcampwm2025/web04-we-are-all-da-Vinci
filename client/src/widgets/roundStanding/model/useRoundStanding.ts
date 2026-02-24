/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useGameStore } from '@/entities/gameRoom';
import type { PlayerScore } from '@/entities/roundResult';
import { useEffect, useState } from 'react';
import { SoundManager } from '@/shared/lib';
import { SFX_LIST } from '@/shared/config';
import { useFlipAnimation } from './useFlipAnimation';

const SORT_DELAY = 1500; // 점수 증가 연출 이후 순위 정렬을 시작하기까지의 대기 시간(ms)

export const useRoundStanding = () => {
  const standingResults = useGameStore((s) => s.standingResults);
  const previousStandingResults = useGameStore(
    (s) => s.previousStandingResults,
  );
  const currentRound = useGameStore((s) => s.currentRound);

  const [displayResults, setDisplayResults] = useState<PlayerScore[]>([]);
  const isSorted = displayResults === standingResults; // standingResults로 교체된 시점이 정렬 완료

  const { setItemRef, animate } = useFlipAnimation();

  const previousScoreMap = new Map(
    previousStandingResults.map((p) => [p.profileId, p.score]),
  );

  // currentRound 변경 시점에만 반응해 점수 증가 연출 전 표시 상태를 초기화하는 effect
  useEffect(() => {
    if (previousStandingResults.length > 0) {
      setDisplayResults(previousStandingResults);
    } else {
      setDisplayResults(standingResults.map((p) => ({ ...p, score: 0 })));
    }
  }, [currentRound]);

  // SORT_DELAY 후 정렬된 순위 공개 + FLIP 애니메이션 실행
  useEffect(() => {
    if (!standingResults.length) return;

    const timer = setTimeout(() => {
      animate(() => setDisplayResults(standingResults));
      SoundManager.getInstance().playSound(SFX_LIST.ROUND_END);
    }, SORT_DELAY);

    return () => clearTimeout(timer);
  }, [standingResults, animate]);

  return {
    displayResults,
    isSorted,
    currentRound,
    previousScoreMap,
    setItemRef,
  };
};
