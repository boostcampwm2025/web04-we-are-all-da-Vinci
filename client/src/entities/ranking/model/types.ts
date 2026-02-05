// Re-export from shared package
export type { RankingEntry } from '@shared/types';

// Client-specific constants
export const RANK_CHANGE = {
  UP: 'up',
  DOWN: 'down',
  SAME: 'same',
  NEW: 'new',
} as const;

export type RankChange = (typeof RANK_CHANGE)[keyof typeof RANK_CHANGE];

export type PlayerColor = 'blue' | 'gray' | 'gold' | 'silver' | 'bronze';
