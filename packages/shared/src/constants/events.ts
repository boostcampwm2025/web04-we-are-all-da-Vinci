// Client -> Server 이벤트
export const ServerEvents = {
  USER_JOIN: 'user:join',
  USER_SCORE: 'user:score',
  USER_DRAWING: 'user:drawing',
  USER_KICK: 'user:kick',
  ROOM_SETTINGS: 'room:settings',
  ROOM_START: 'room:start',
  ROOM_RESTART: 'room:restart',
  USER_PRACTICE: 'user:practice',
  CHAT_MESSAGE: 'chat:message',
} as const;

// Server -> Client 이벤트
export const ClientEvents = {
  USER_WAITLIST: 'user:waitlist',
  ROOM_METADATA: 'room:metadata',
  ROOM_LEADERBOARD: 'room:leaderboard',
  ROOM_TIMER: 'room:timer',
  ROOM_ROUND_REPLAY: 'room:round_replay',
  ROOM_ROUND_STANDING: 'room:round_standing',
  ROOM_GAME_END: 'room:game_end',
  ROOM_PROMPT: 'room:prompt',
  ROOM_KICKED: 'room:kicked',
  USER_PRACTICE_STARTED: 'user:practice:started',
  CHAT_BROADCAST: 'chat:broadcast',
  CHAT_HISTORY: 'chat:history',
  CHAT_ERROR: 'chat:error',
  ERROR: 'error',
} as const;

export type ServerEvent = (typeof ServerEvents)[keyof typeof ServerEvents];
export type ClientEvent = (typeof ClientEvents)[keyof typeof ClientEvents];
