import { useGameStore } from '@/entities/gameRoom';
import type { Stroke } from '@/entities/similarity';
import type { WaitlistResponse } from '@/features/waitingRoomActions';
import { getSocket } from '@/shared/api';
import { CLIENT_EVENTS } from '@/shared/config';
import { useEffect } from 'react';

/**
 * 대기열 및 연습 모드 이벤트 처리 훅
 *
 * USER_WAITLIST: 게임 중 입장 시 대기열에 추가됨
 * USER_PRACTICE_STARTED: 대기 중 연습 모드 시작
 *
 * @param enabled - 이벤트 리스너 활성화 여부
 */
export const useWaitlistEvents = (enabled: boolean) => {
  const setIsInWaitlist = useGameStore((state) => state.setIsInWaitlist);
  const setIsPracticing = useGameStore((state) => state.setIsPracticing);
  const setPracticePrompt = useGameStore((state) => state.setPracticePrompt);
  const setGameProgress = useGameStore((state) => state.setGameProgress);

  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();

    const handleWaitlist = ({ currentRound, totalRounds }: WaitlistResponse) => {
      setIsInWaitlist(true);
      setGameProgress({ currentRound, totalRounds });
    };

    const handlePracticeStarted = (promptStrokes: Stroke[]) => {
      setPracticePrompt(promptStrokes);
      setIsPracticing(true);
    };

    socket.on(CLIENT_EVENTS.USER_WAITLIST, handleWaitlist);
    socket.on(CLIENT_EVENTS.USER_PRACTICE_STARTED, handlePracticeStarted);

    return () => {
      socket.off(CLIENT_EVENTS.USER_WAITLIST, handleWaitlist);
      socket.off(CLIENT_EVENTS.USER_PRACTICE_STARTED, handlePracticeStarted);
    };
  }, [enabled, setIsInWaitlist, setIsPracticing, setPracticePrompt, setGameProgress]);
};
