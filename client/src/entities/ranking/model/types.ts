export type RankChange = 'up' | 'down' | 'same' | 'new';

export interface RankingEntry {
  socketId: string;
  nickname: string;
  similarity: number;
  rank: number;
  previousRank: number | null; // null = 신규 진입
}
