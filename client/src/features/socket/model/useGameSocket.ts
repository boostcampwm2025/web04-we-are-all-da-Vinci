import { getSocket } from '@/shared/api';
import { useLocalStorageWatch } from '@/shared/model';
import { useParams } from 'react-router-dom';
import { useChatEvents } from './useChatEvents';
import { useErrorEvents } from './useErrorEvents';
import { useGameDataEvents } from './useGameDataEvents';
import { useResultEvents } from './useResultEvents';
import { useRoomEvents } from './useRoomEvents';
import { useSocketConnection } from './useSocketConnection';
import { useTabLock } from './useTabLock';
import { useWaitlistEvents } from './useWaitlistEvents';

/**
 * 게임 소켓 연결 및 이벤트 관리 (조합 훅)
 */
export const useGameSocket = () => {
  const { roomId } = useParams<{ roomId: string }>();

  // 1. 탭 잠금
  const { acquired: tabLockAcquired } = useTabLock(roomId);

  // 2. 프로필 감시
  const nickname = useLocalStorageWatch('nickname');
  const profileId = useLocalStorageWatch('profileId');

  // 연결 조건
  const enabled =
    tabLockAcquired === true && !!nickname && !!profileId && !!roomId;

  // 3. 이벤트 훅들 (순서 중요: 연결 전에 리스너 등록)
  useRoomEvents(enabled);
  useGameDataEvents(enabled);
  useResultEvents(enabled);
  useWaitlistEvents(enabled);
  useChatEvents(enabled);
  useErrorEvents(enabled);

  // 4. 소켓 연결
  useSocketConnection({
    roomId: roomId || '',
    nickname: nickname || '',
    profileId: profileId || '',
    enabled,
  });

  return getSocket();
};
