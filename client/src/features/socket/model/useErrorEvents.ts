import { useGameStore } from '@/entities/gameRoom';
import { getSocket } from '@/shared/api';
import { CLIENT_EVENTS } from '@/shared/config';
import { useEffect } from 'react';

/**
 * 에러 이벤트 처리 훅
 *
 * 서버에서 에러 발생 시 경고 메시지를 표시하고 메인 페이지로 이동한다.
 *
 * @param enabled - 이벤트 리스너 활성화 여부
 */
export const useErrorEvents = (enabled: boolean) => {
  const setAlertMessage = useGameStore((state) => state.setAlertMessage);
  const setPendingNavigation = useGameStore(
    (state) => state.setPendingNavigation,
  );

  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();

    const handleError = (error: { message: string }) => {
      setAlertMessage(error.message);
      setPendingNavigation('/');
    };

    socket.on(CLIENT_EVENTS.ERROR, handleError);

    return () => {
      socket.off(CLIENT_EVENTS.ERROR, handleError);
    };
  }, [enabled, setAlertMessage, setPendingNavigation]);
};
