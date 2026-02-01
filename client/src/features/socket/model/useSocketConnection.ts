import { useGameStore } from '@/entities/gameRoom';
import { useChatStore } from '@/features/chat';
import { disconnectSocket, getSocket } from '@/shared/api';
import { SERVER_EVENTS } from '@/shared/config';
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
  const reset = useGameStore((state) => state.reset);
  const clearChat = useChatStore((state) => state.clear);

  // 새로고침 감지 (reset() 충돌 방지)
  const isPageUnloadingRef = useRef(false);

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

    const socket = getSocket();

    socket.connect();

    socket.on('connect', () => {
      setMySocketId(socket.id!);
      setConnected(true);
      socket.emit(SERVER_EVENTS.USER_JOIN, { roomId, nickname, profileId });
    });

    socket.on('disconnect', () => {
      setMySocketId(null);
      setConnected(false);
    });

    return () => {
      socket.off('connect');
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
    reset,
    clearChat,
  ]);
};
