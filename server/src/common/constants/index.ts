export const REDIS_TTL = 3600;

export const ServerEvents = {
  // 클라이언트 -> 서버
  USER_JOIN: 'user:join',
  USER_SCORE: 'user:score',
  USER_DRAWING: 'user:drawing',
  ROOM_SETTINGS: 'room:settings',
  ROOM_START: 'room:start',
} as const;

export const ClientEvents = {
  // 서버 -> 클라이언트
  USER_WAITLIST: 'user:waitlist',
  ROOM_METADATA: 'room:metadata',
  ROOM_LEADERBOARD: 'room:leaderboard',
  ROOM_TIMER: 'room:timer',
  ROOM_ROUND_END: 'room:round_end',
  ROOM_GAME_END: 'room:game_end',
  ROOM_PROMPT: 'room:prompt',
  ERROR: 'error',
} as const;

export const GamePhase = {
  WAITING: 'WAITING',
  PROMPT: 'PROMPT',
  DRAWING: 'DRAWING',
  ROUND_END: 'ROUND_END',
  GAME_END: 'GAME_END',
};
