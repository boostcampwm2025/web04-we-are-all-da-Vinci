import { useGameStore } from '@/entities/gameRoom';
import type { Stroke } from '@/entities/similarity';
import { getSocket } from '@/shared/api';
import { CLIENT_EVENTS } from '@/shared/config';
import { useEffect } from 'react';
import { buildRankings, type ServerRankingEntry } from '../lib/socketHandlers';

/**
 * 실시간 게임 데이터 이벤트 처리 훅
 *
 * ROOM_TIMER: 남은 시간 업데이트
 * ROOM_LEADERBOARD: 실시간 순위 업데이트
 * ROOM_PROMPT: 제시어 스트로크 데이터 수신
 *
 * @param enabled - 이벤트 리스너 활성화 여부
 */
export const useGameDataEvents = (enabled: boolean) => {
  const setTimer = useGameStore((state) => state.setTimer);
  const setLiveRankings = useGameStore((state) => state.setLiveRankings);
  const setPromptStrokes = useGameStore((state) => state.setPromptStrokes);

  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();

    const handleTimer = ({ timeLeft }: { timeLeft: number }) => {
      setTimer(timeLeft);
    };

    const handleLeaderboard = (data: { rankings: ServerRankingEntry[] }) => {
      const currentRankings = useGameStore.getState().liveRankings;
      setLiveRankings(buildRankings(data.rankings, currentRankings));
    };

    const handlePrompt = (promptStrokes: Stroke[]) => {
      setPromptStrokes(promptStrokes);
    };

    socket.on(CLIENT_EVENTS.ROOM_TIMER, handleTimer);
    socket.on(CLIENT_EVENTS.ROOM_LEADERBOARD, handleLeaderboard);
    socket.on(CLIENT_EVENTS.ROOM_PROMPT, handlePrompt);

    return () => {
      socket.off(CLIENT_EVENTS.ROOM_TIMER, handleTimer);
      socket.off(CLIENT_EVENTS.ROOM_LEADERBOARD, handleLeaderboard);
      socket.off(CLIENT_EVENTS.ROOM_PROMPT, handlePrompt);
    };
  }, [enabled, setTimer, setLiveRankings, setPromptStrokes]);
};
