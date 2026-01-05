export const GAME_PHASE_COMPONENT_MAP = {
  WAITING: 'Waiting',
  DRAWING: 'Drawing',
  ROUND_END: 'RoundEnd',
  GAME_END: 'GameEnd',
} as const;

const PhaseComponent = GAME_PHASE_COMPONENT_MAP[gameState.phase];
