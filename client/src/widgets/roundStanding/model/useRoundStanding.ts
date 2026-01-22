import { useGameStore } from '@/entities/gameRoom/model';
import type { PlayerScore } from '@/entities/roundResult/model/types';
import { useEffect, useMemo, useState } from 'react';
import { useFlipAnimation } from './useFlipAnimation';

const SORT_DELAY = 1500; // 점수 증가 연출 이후 순위 정렬을 시작하기까지의 대기 시간(ms)

export const useRoundStanding = () => {
  const standingResults = useGameStore((s) => s.standingResults);
  const previousStandingResults = useGameStore(
    (s) => s.previousStandingResults,
  );
  const currentRound = useGameStore((s) => s.currentRound);

  const [displayResults, setDisplayResults] = useState<PlayerScore[]>([]);
  const [isSorted, setIsSorted] = useState(false);

  // 리스트 순서 변경 시 위치 이동을 자연스럽게 보여주기 위한 FLIP 애니메이션
  const { setRowRef, playFlip } = useFlipAnimation();

  // 이전 점수를 빠르게 조회하기 위한 맵
  // → 점수 증가량 표시 등 이전 값 비교에 사용
  const previousScoreMap = useMemo(() => {
    return new Map(previousStandingResults.map((p) => [p.socketId, p.score]));
  }, [previousStandingResults]);

  // 초기 표시 데이터 설정
  // 1) 이전 점수가 있으면: 정렬 전 상태 그대로 표시
  // 2) 첫 라운드면: 점수 0부터 시작해 증가하는 연출을 만들기 위해 초기화
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsSorted(false);

      if (previousStandingResults.length > 0) {
        setDisplayResults(previousStandingResults);
      } else if (standingResults.length > 0) {
        setDisplayResults(standingResults.map((p) => ({ ...p, score: 0 })));
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [currentRound, previousStandingResults, standingResults]);

  // 일정 시간 후 정렬된 순위 표시
  // → FLIP 애니메이션을 사용해 순위 변화가 자연스럽게 보이도록 처리
  // (서버에서 이미 점수 높은 순으로 정렬되어 옴)
  useEffect(() => {
    if (!standingResults.length) return;

    const timer = setTimeout(() => {
      playFlip(setDisplayResults, standingResults);
      setIsSorted(true);
    }, SORT_DELAY);

    return () => clearTimeout(timer);
  }, [standingResults, playFlip]);

  return {
    displayResults,
    isSorted,
    currentRound,
    previousScoreMap,
    setRowRef,
  };
};
