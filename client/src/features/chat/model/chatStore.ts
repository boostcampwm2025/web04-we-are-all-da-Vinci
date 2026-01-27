import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ChatMessage } from './types';
import { CHAT_HISTORY_LIMIT } from './types';

interface ChatState {
  messages: ChatMessage[];

  addMessage: (message: ChatMessage) => void;
  setHistory: (messages: ChatMessage[]) => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set) => ({
      messages: [],

      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message].slice(-CHAT_HISTORY_LIMIT),
        })),

      setHistory: (messages) =>
        set({ messages: messages.slice(-CHAT_HISTORY_LIMIT) }),

      clear: () => set({ messages: [] }),
    }),
    { name: 'Chat Store' },
  ),
);

// Selectors
export const selectChatMessages = (state: ChatState) => state.messages;
