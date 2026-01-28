/**
 * 시스템 메시지 유형
 */
export type SystemMessageType =
  | 'join'
  | 'leave'
  | 'kick'
  | 'game_start'
  | 'round_start'
  | 'host_change'
  | 'timer_warning';

/**
 * 채팅 메시지 인터페이스
 */
export interface ChatMessage {
  type: 'user' | 'system';
  socketId?: string;
  nickname?: string;
  profileId?: string;
  message: string;
  timestamp: number;
  systemType?: SystemMessageType;
}

// 채팅 상수 (서버와 동기화 필요)
export const CHAT_MAX_LENGTH = 100;
export const CHAT_HISTORY_LIMIT = 50;
