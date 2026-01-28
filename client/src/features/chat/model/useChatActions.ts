import { useCallback } from 'react';
import { getSocket } from '@/shared/api';
import { SERVER_EVENTS } from '@/shared/config';
import { CHAT_MAX_LENGTH } from './types';

const useChatActions = (roomId: string | undefined) => {
  const sendMessage = useCallback(
    (message: string) => {
      if (!roomId) return;

      const trimmedMessage = message.trim();
      if (!trimmedMessage) return;

      const socket = getSocket();
      socket.emit(SERVER_EVENTS.CHAT_MESSAGE, {
        roomId,
        message: trimmedMessage.slice(0, CHAT_MAX_LENGTH),
      });
    },
    [roomId],
  );

  return { sendMessage };
};
export default useChatActions;
