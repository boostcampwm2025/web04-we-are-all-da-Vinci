export const GAME_PHASE = {
  WAITING: 'WAITING',
  PROMPT: 'PROMPT',
  DRAWING: 'DRAWING',
  ROUND_END: 'ROUND_END',
  GAME_END: 'GAME_END',
} as const;

export type Phase = (typeof GAME_PHASE)[keyof typeof GAME_PHASE];
