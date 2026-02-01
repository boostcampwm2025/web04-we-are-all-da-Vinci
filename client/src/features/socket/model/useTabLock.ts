import { useGameStore } from '@/entities/gameRoom';
import { acquireTabLockAsync } from '@/shared/lib/tabLock';
import { useEffect, useState } from 'react';

/**
 * 탭 잠금 획득 및 해제 관리 훅
 *
 * BroadcastChannel을 사용하여 같은 roomId로 중복 탭 접속을 방지한다.
 * 잠금 획득 실패 시 경고 메시지와 함께 메인 페이지로 이동한다.
 *
 * @param roomId - 방 ID
 * @returns acquired - 잠금 획득 여부 (null: 진행 중, true: 획득, false: 실패)
 */
export const useTabLock = (roomId: string | undefined) => {
  const [acquired, setAcquired] = useState<boolean | null>(null);
  const setAlertMessage = useGameStore((state) => state.setAlertMessage);
  const setPendingNavigation = useGameStore(
    (state) => state.setPendingNavigation,
  );

  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;
    let releaseFn: (() => void) | null = null;

    acquireTabLockAsync(roomId).then((lock) => {
      if (cancelled) {
        lock.release();
        return;
      }
      releaseFn = lock.release;
      setAcquired(lock.acquired);

      if (!lock.acquired) {
        setAlertMessage('다른 탭에서 게임 중입니다.');
        setPendingNavigation('/');
      }
    });

    return () => {
      cancelled = true;
      releaseFn?.();
    };
  }, [roomId, setAlertMessage, setPendingNavigation]);

  return { acquired };
};
