export const REDIS_TTL = 1800;
export const PROMPT_TIME = Number(process.env.PROMPT_TIME) || 5; // 그림 외우기 시간 (초)
export const DRAWING_END_DELAY = Number(process.env.DRAWING_END_DELAY) || 1800; // 그림 그리기 종료 후 대기 시간 (ms)
export const ROUND_REPLAY_TIME = Number(process.env.ROUND_REPLAY_TIME) || 15; // 라운드 결과(리플레이) 표시 시간 (초)
export const ROUND_STANDING_TIME =
  Number(process.env.ROUND_STANDING_TIME) || 10; // 라운드 점수 및 랭킹 표시 시간 (초)
export const GAME_END_TIME = Number(process.env.GAME_END_TIME) || 30; // 게임 종료 화면 표시 시간 (초)

// 채팅 관련 상수
export const CHAT_MAX_LENGTH = 50; // 메시지 최대 글자 수
export const CHAT_HISTORY_LIMIT = 50; // 이전 메시지 로드 개수
export const CHAT_RATE_LIMIT_SHORT = { messages: 8, seconds: 5 }; // 단기 Rate Limit
export const CHAT_RATE_LIMIT_LONG = { messages: 30, seconds: 30 }; // 장기 Rate Limit

// Re-export from shared package
export { ServerEvents, ClientEvents } from '@shared/types';

// GamePhase를 로컬에 정의 (타입 해석 문제 방지)
export const GamePhase = {
  WAITING: 'WAITING',
  PROMPT: 'PROMPT',
  DRAWING: 'DRAWING',
  ROUND_REPLAY: 'ROUND_REPLAY',
  ROUND_STANDING: 'ROUND_STANDING',
  GAME_END: 'GAME_END',
} as const;
