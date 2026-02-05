import type { GameState } from './gameStore';

// Selectors (순수 함수 - 재사용 가능)
export const selectPlayers = (state: GameState) => state.players;
export const selectSettings = (state: GameState) => state.settings;
export const selectPhase = (state: GameState) => state.phase;
export const selectLiveRankings = (state: GameState) => state.liveRankings;
export const selectTimer = (state: GameState) => state.timer;
