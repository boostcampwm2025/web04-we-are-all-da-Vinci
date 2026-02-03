import { useGameStore } from '@/entities/gameRoom';
import { regenerateProfileId } from '@/entities/profile';
import { useChatStore } from '@/features/chat';
import { disconnectSocket, getSocket } from '@/shared/api';
import { SERVER_EVENTS } from '@/shared/config';
import { isE2ETestMode } from '@/shared/lib/e2eTestMode';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseSocketConnectionOptions {
  roomId: string;
  nickname: string;
  profileId: string;
  enabled: boolean;
}

/**
 * 소켓 연결/해제 및 방 입장 관리 훅
 *
 * enabled가 true일 때만 소켓 연결을 시도한다.
 * 연결 시 USER_JOIN 이벤트를 전송하고, 해제 시 상태를 정리한다.
 * profileId가 연결 중 변경되면 조작으로 간주하고 메인 페이지로 이동한다.
 * 새로고침 시에는 sessionStorage 보존을 위해 reset을 스킵한다.
 *
 * @param options.roomId - 방 ID
 * @param options.nickname - 닉네임
 * @param options.profileId - 프로필 ID
 * @param options.enabled - 소켓 연결 활성화 여부
 */
export const useSocketConnection = ({
  roomId,
  nickname,
  profileId,
  enabled,
}: UseSocketConnectionOptions): void => {
  const navigate = useNavigate();
  const setMySocketId = useGameStore((state) => state.setMySocketId);
  const setConnected = useGameStore((state) => state.setConnected);
  const setAlertMessage = useGameStore((state) => state.setAlertMessage);
  const setPendingNavigation = useGameStore(
    (state) => state.setPendingNavigation,
  );
  const reset = useGameStore((state) => state.reset);
  const clearChat = useChatStore((state) => state.clear);

  // 새로고침 감지 (reset() 충돌 방지)
  const isPageUnloadingRef = useRef(false);

  // profileId 변경 감지를 위한 초기값 저장
  const initialProfileIdRef = useRef<string | null>(null);

  useEffect(() => {
    const handleBeforeUnload = () => {
      isPageUnloadingRef.current = true;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (!roomId) {
      console.error('roomId가 없습니다');
      navigate('/');
      return;
    }

    if (!enabled) {
      return;
    }

    // 최초 연결 시 profileId 저장
    if (initialProfileIdRef.current === null) {
      initialProfileIdRef.current = profileId;
    }

    // profileId가 변경되면 조작으로 간주하고 메인으로 이동
    // E2E 테스트 모드에서는 스킵
    if (!isE2ETestMode() && initialProfileIdRef.current !== profileId) {
      regenerateProfileId();
      setAlertMessage('프로필 정보가 변경되어 메인으로 이동합니다.');
      setPendingNavigation('/');
      return;
    }

    const socket = getSocket();

    const handleConnect = () => {
      setMySocketId(socket.id!);
      setConnected(true);
      socket.emit(SERVER_EVENTS.USER_JOIN, { roomId, nickname, profileId });
    };

    socket.on('connect', handleConnect);

    socket.on('disconnect', () => {
      setMySocketId(null);
      setConnected(false);
    });

    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect');
      disconnectSocket();

      if (!isPageUnloadingRef.current) {
        reset();
        clearChat();
      }
    };
  }, [
    roomId,
    nickname,
    profileId,
    enabled,
    navigate,
    setMySocketId,
    setConnected,
    setAlertMessage,
    setPendingNavigation,
    reset,
    clearChat,
  ]);
};

