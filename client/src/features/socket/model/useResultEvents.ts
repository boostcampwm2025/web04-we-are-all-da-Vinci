import type { GameEndResponse } from '@/entities/gameResult';
import { useGameStore } from '@/entities/gameRoom';
import type {
  RoundReplayResponse,
  RoundStandingResponse,
} from '@/entities/roundResult';
import { getSocket } from '@/shared/api';
import { CLIENT_EVENTS } from '@/shared/config';
import { captureException } from '@/shared/lib/sentry';
import { useEffect } from 'react';

/**
 * 라운드/게임 결과 이벤트 처리 훅
 *
 * ROOM_ROUND_REPLAY: 라운드 결과 애니메이션 데이터
 * ROOM_ROUND_STANDING: 라운드 순위 데이터
 * ROOM_GAME_END: 최종 결과 및 하이라이트 데이터
 *
 * @param enabled - 이벤트 리스너 활성화 여부
 */
export const useResultEvents = (enabled: boolean) => {
  const setRoundResults = useGameStore((state) => state.setRoundResults);
  const setPromptStrokes = useGameStore((state) => state.setPromptStrokes);
  const setStandingResults = useGameStore((state) => state.setStandingResults);
  const setFinalResults = useGameStore((state) => state.setFinalResults);
  const setHighlight = useGameStore((state) => state.setHighlight);

  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();

    const handleRoundReplay = (response: RoundReplayResponse) => {
      try {
        setRoundResults(response.rankings);
        setPromptStrokes(response.promptStrokes);
      } catch (error) {
        captureException(error instanceof Error ? error : new Error(String(error)), {
          tags: { error_type: 'socket_event_handler', event: 'ROOM_ROUND_REPLAY' },
          level: 'error',
        });
      }
    };

    const handleRoundStanding = (response: RoundStandingResponse) => {
      try {
        setStandingResults(response.rankings);
      } catch (error) {
        captureException(error instanceof Error ? error : new Error(String(error)), {
          tags: { error_type: 'socket_event_handler', event: 'ROOM_ROUND_STANDING' },
          level: 'error',
        });
      }
    };

    const handleGameEnd = (response: GameEndResponse) => {
      try {
        setFinalResults(response.finalRankings);
        setHighlight(response.highlight);
      } catch (error) {
        captureException(error instanceof Error ? error : new Error(String(error)), {
          tags: { error_type: 'socket_event_handler', event: 'ROOM_GAME_END' },
          level: 'error',
        });
      }
    };

    socket.on(CLIENT_EVENTS.ROOM_ROUND_REPLAY, handleRoundReplay);
    socket.on(CLIENT_EVENTS.ROOM_ROUND_STANDING, handleRoundStanding);
    socket.on(CLIENT_EVENTS.ROOM_GAME_END, handleGameEnd);

    return () => {
      socket.off(CLIENT_EVENTS.ROOM_ROUND_REPLAY, handleRoundReplay);
      socket.off(CLIENT_EVENTS.ROOM_ROUND_STANDING, handleRoundStanding);
      socket.off(CLIENT_EVENTS.ROOM_GAME_END, handleGameEnd);
    };
  }, [
    enabled,
    setRoundResults,
    setPromptStrokes,
    setStandingResults,
    setFinalResults,
    setHighlight,
  ]);
};
