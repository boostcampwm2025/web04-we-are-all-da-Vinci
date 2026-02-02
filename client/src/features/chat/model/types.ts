// Re-export from shared package
export type { SystemMessageType, ChatMessage } from '@shared/types';

// Chat constants (synced with server via shared package)
export const CHAT_MAX_LENGTH = 100;
export const CHAT_HISTORY_LIMIT = 50;
