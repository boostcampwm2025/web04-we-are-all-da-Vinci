export const SERVER_EVENTS = {
  USER_JOIN: 'user:join',
  USER_SCORE: 'user:score',
  USER_DRAWING: 'user:drawing',
  ROOM_SETTINGS: 'room:settings',
  ROOM_START: 'room:start',
} as const;

export const CLIENT_EVENTS = {
  ROOM_METADATA: 'room:metadata',
  ROOM_LEADERBOARD: 'room:leaderboard',
  ROOM_TIMER: 'room:timer',
  ROOM_ROUND_END: 'room:round_end',
  ROOM_GAME_END: 'room:game_end',
  ROOM_PROMPT: 'room:prompt',
  USER_WAITLIST: 'user:waitlist',
  ERROR: 'error',
} as const;
