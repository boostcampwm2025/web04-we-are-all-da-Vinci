import { useGameStore } from '@/entities/gameRoom';
import { getSocket } from '@/shared/api';
import { CLIENT_EVENTS } from '@/shared/config';
import { regenerateProfileId } from '@/shared/lib/profile';
import { useEffect } from 'react';

/** INVALID_PROFILE_ID 에러 메시지 (서버 ErrorCode와 동일) */
// TODO: zod 마이그레이션 이후 중앙에서 상수 관리하게 변경
const INVALID_PROFILE_ID_MESSAGE =
  '유효하지 않은 프로필 정보입니다. 다시 접속해주세요.';

/**
 * 에러 이벤트 처리 훅
 *
 * 서버에서 에러 발생 시 경고 메시지를 표시하고 메인 페이지로 이동한다.
 * INVALID_PROFILE_ID 에러의 경우 새로운 profileId를 재할당한다.
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
      // INVALID_PROFILE_ID 에러 시 새 profileId 발급
      if (error.message === INVALID_PROFILE_ID_MESSAGE) {
        regenerateProfileId();
      }

      setAlertMessage(error.message);
      setPendingNavigation('/');
    };

    socket.on(CLIENT_EVENTS.ERROR, handleError);

    return () => {
      socket.off(CLIENT_EVENTS.ERROR, handleError);
    };
  }, [enabled, setAlertMessage, setPendingNavigation]);
};
