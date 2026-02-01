import { useChatStore, type ChatMessage } from '@/features/chat';
import { getSocket } from '@/shared/api';
import { CLIENT_EVENTS } from '@/shared/config';
import { useEffect } from 'react';

/**
 * 채팅 관련 이벤트 처리 훅
 *
 * CHAT_BROADCAST: 새 채팅 메시지 수신
 * CHAT_HISTORY: 방 입장 시 채팅 기록 수신
 * CHAT_ERROR: 채팅 에러 (시스템 메시지로 표시)
 *
 * @param enabled - 이벤트 리스너 활성화 여부
 */
export const useChatEvents = (enabled: boolean) => {
  const addChatMessage = useChatStore((state) => state.addMessage);
  const setChatHistory = useChatStore((state) => state.setHistory);

  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();

    const handleBroadcast = (message: ChatMessage) => {
      addChatMessage(message);
    };

    const handleHistory = (payload: { roomId: string; messages: ChatMessage[] }) => {
      setChatHistory(payload.messages);
    };

    const handleError = (error: { message: string }) => {
      const errorMessage: ChatMessage = {
        type: 'system',
        message: error.message,
        timestamp: Date.now(),
        systemType: 'timer_warning',
      };
      addChatMessage(errorMessage);
    };

    socket.on(CLIENT_EVENTS.CHAT_BROADCAST, handleBroadcast);
    socket.on(CLIENT_EVENTS.CHAT_HISTORY, handleHistory);
    socket.on(CLIENT_EVENTS.CHAT_ERROR, handleError);

    return () => {
      socket.off(CLIENT_EVENTS.CHAT_BROADCAST, handleBroadcast);
      socket.off(CLIENT_EVENTS.CHAT_HISTORY, handleHistory);
      socket.off(CLIENT_EVENTS.CHAT_ERROR, handleError);
    };
  }, [enabled, addChatMessage, setChatHistory]);
};
