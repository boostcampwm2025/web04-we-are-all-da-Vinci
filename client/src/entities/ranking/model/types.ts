export const RANK_CHANGE = {
  UP: 'up',
  DOWN: 'down',
  SAME: 'same',
  NEW: 'new',
} as const;

export type RankChange = (typeof RANK_CHANGE)[keyof typeof RANK_CHANGE];

export type PlayerColor = 'blue' | 'gray';

export interface RankingEntry {
  socketId: string;
  nickname: string;
  similarity: number;
  rank: number;
  previousRank: number | null; // null = 신규 진입
}
