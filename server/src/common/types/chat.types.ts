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

/**
 * 채팅 송신 DTO (클라이언트 → 서버)
 */
export interface ChatMessagePayload {
  roomId: string;
  message: string;
}

/**
 * 채팅 히스토리 응답
 */
export interface ChatHistoryPayload {
  roomId: string;
  messages: ChatMessage[];
}
