import { useGameStore, useCurrentPlayer } from '@/entities/gameRoom/model';
import type { PlayerScore } from '@/entities/roundResult/model/types';
import { useEffect, useMemo, useState } from 'react';
import { useFlipAnimation } from './useFlipAnimation';

const SORT_DELAY = 1500; // 점수 증가 연출 이후 순위 정렬을 시작하기까지의 대기 시간(ms)

export const useRoundStanding = () => {
  const standingResults = useGameStore((s) => s.standingResults);
  const previousStandingResults = useGameStore((s) => s.previousStandingResults);
  const currentRound = useGameStore((s) => s.currentRound);
  const currentPlayer = useCurrentPlayer();

  const [displayResults, setDisplayResults] = useState<PlayerScore[]>([]);
  const [isSorted, setIsSorted] = useState(false);

  // 리스트 순서 변경 시 위치 이동을 자연스럽게 보여주기 위한 FLIP 애니메이션
  const { setRowRef, playFlip } = useFlipAnimation<PlayerScore>();

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

  // 일정 시간 후 점수 기준으로 정렬
  // → FLIP 애니메이션을 사용해 순위 변화가 자연스럽게 보이도록 처리
  useEffect(() => {
    if (!standingResults.length) return;

    const timer = setTimeout(() => {
      const sorted = [...standingResults].sort((a, b) => b.score - a.score);
      playFlip(setDisplayResults, sorted);
      setIsSorted(true);
    }, SORT_DELAY);

    return () => clearTimeout(timer);
  }, [standingResults, playFlip]);

  // 현재 표시 중인 결과 기준으로 내 등수 계산 (1-based index)
  // → 애니메이션 중에도 UI와 일관된 등수 표시를 위해 displayResults 기준 사용
  const myRank = useMemo(() => {
    if (!currentPlayer) return -1;
    const index = displayResults.findIndex(
      (p) => p.socketId === currentPlayer.socketId
    );
    return index !== -1 ? index + 1 : -1;
  }, [displayResults, currentPlayer]);

  // 등수에 따라 사용자에게 보여줄 피드백 메시지
  // → UI 레이어에서 조건 분기 로직을 제거하기 위한 책임 분리
  const rankMessage = useMemo(() => {
    if (myRank === -1) return '';
    if (myRank === 1) return `현재 ${myRank}등이에요! 이 기세를 유지하세요! 👑`;
    if (myRank <= 3) return `현재 ${myRank}등이에요! 1등이 코앞이에요! 🔥`;
    return `현재 ${myRank}등이에요! 조금만 더 노력해서 1등 해봐요! 👊`;
  }, [myRank]);

  return {
    displayResults,
    isSorted,
    currentRound,
    previousScoreMap,
    rankMessage,
    setRowRef,
  };
};
