import { useGameStore } from '@/entities/gameRoom';
import { getSocket } from '@/shared/api';
import { CLIENT_EVENTS, VALIDATION } from '@/shared/config';
import { regenerateProfileId } from '@/shared/lib/profile';
import { captureException } from '@/shared/lib/sentry';
import { useEffect } from 'react';

/**
 * Zod 직렬화 에러 메시지에서 닉네임 검증 실패 여부 판별.
 * 서버가 parsed.error.message를 그대로 throw하면 JSON 배열 형태로 전달됨.
 */
const isNicknameValidationError = (message: string): boolean => {
  try {
    const errors = JSON.parse(message);
    return (
      Array.isArray(errors) &&
      errors.some((e) => Array.isArray(e.path) && e.path.includes('nickname'))
    );
  } catch {
    return false;
  }
};

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

      // 닉네임 검증 실패 (Zod JSON) → 사용자 친화적 메시지로 교체 + Sentry 그룹핑
      if (isNicknameValidationError(error.message)) {
        captureException(new Error('서버 닉네임 검증 실패'), {
          fingerprint: ['nickname-validation-error'],
          tags: { error_type: 'nickname_validation' },
          extra: { rawMessage: error.message },
          level: 'warning',
        });
        setAlertMessage(
          `닉네임은 ${VALIDATION.NICKNAME_MAX_LENGTH}자 이하로 입력해주세요.`,
        );
        setPendingNavigation('/');
        return;
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
