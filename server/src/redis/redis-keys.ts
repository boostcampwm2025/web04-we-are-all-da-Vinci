/**
 * Redis 키 패턴 중앙 관리
 * 모든 Cache Service에서 이 유틸리티를 사용하여 키 일관성 유지
 */
export const RedisKeys = {
  // Room
  room: (roomId: string) => `room:${roomId}:info`,
  players: (roomId: string) => `room:${roomId}:players`,
  prompts: (roomId: string) => `room:${roomId}:prompts`,
  activeRooms: () => `active:rooms`,

  // Player
  player: (socketId: string) => `player:${socketId}`,

  // Timer
  timer: (roomId: string) => `timer:${roomId}`,

  // Waitlist
  waitlist: (roomId: string) => `waiting:${roomId}`,

  // Leaderboard
  leaderboard: (roomId: string) => `leaderboard:${roomId}`,

  // Standings
  standings: (roomId: string) => `final:${roomId}`,

  // Drawing Progress (profileId 기반)
  drawing: (roomId: string, round: number, profileId: string) =>
    `drawing:${roomId}:${round}:${profileId}`,
  drawingRoundScan: (roomId: string, round: number) =>
    `drawing:${roomId}:${round}:*`,
  drawingGameScan: (roomId: string) => `drawing:${roomId}:*`,
  drawingPlayerScan: (roomId: string, profileId: string) =>
    `drawing:${roomId}:*:${profileId}`,

  // Chat
  chat: (roomId: string) => `chat:${roomId}`,
  chatRateLimit: (socketId: string, window: 'short' | 'long') =>
    `ratelimit:chat:${window}:${socketId}`,

  // Grace Period (새로고침 시 일시적 유예)
  gracePeriod: (roomId: string, profileId: string) =>
    `gracePeriod:${roomId}:${profileId}`,
} as const;
