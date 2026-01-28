export const REDIS_TTL = 3600;
export const PROMPT_TIME = 5;
export const DRAWING_END_DELAY = 1800; // 그림 그리기 종료 후 대기 시간 (ms)
export const ROUND_REPLAY_TIME = 15; // 라운드 결과(리플레이) 표시 시간 (초)
export const ROUND_STANDING_TIME = 10; // 라운드 점수 및 랭킹 표시 시간 (초)
export const GAME_END_TIME = 30; // 게임 종료 화면 표시 시간 (초)

// 채팅 관련 상수
export const CHAT_MAX_LENGTH = 100; // 메시지 최대 글자 수
export const CHAT_HISTORY_LIMIT = 50; // 이전 메시지 로드 개수
export const CHAT_RATE_LIMIT_SHORT = { messages: 5, seconds: 5 }; // 단기 Rate Limit
export const CHAT_RATE_LIMIT_LONG = { messages: 20, seconds: 30 }; // 장기 Rate Limit

export const ServerEvents = {
  // 클라이언트 -> 서버
  USER_JOIN: 'user:join',
  USER_SCORE: 'user:score',
  USER_DRAWING: 'user:drawing',
  USER_KICK: 'user:kick',
  ROOM_SETTINGS: 'room:settings',
  ROOM_START: 'room:start',
  ROOM_RESTART: 'room:restart',
  CHAT_MESSAGE: 'chat:message',
} as const;

export const ClientEvents = {
  // 서버 -> 클라이언트
  USER_WAITLIST: 'user:waitlist',
  ROOM_METADATA: 'room:metadata',
  ROOM_LEADERBOARD: 'room:leaderboard',
  ROOM_TIMER: 'room:timer',
  ROOM_ROUND_REPLAY: 'room:round_replay',
  ROOM_ROUND_STANDING: 'room:round_standing',
  ROOM_GAME_END: 'room:game_end',
  ROOM_PROMPT: 'room:prompt',
  ROOM_KICKED: 'room:kicked',
  CHAT_BROADCAST: 'chat:broadcast',
  CHAT_HISTORY: 'chat:history',
  CHAT_ERROR: 'chat:error',
  ERROR: 'error',
} as const;

export const GamePhase = {
  WAITING: 'WAITING',
  PROMPT: 'PROMPT',
  DRAWING: 'DRAWING',
  ROUND_REPLAY: 'ROUND_REPLAY',
  ROUND_STANDING: 'ROUND_STANDING',
  GAME_END: 'GAME_END',
};
