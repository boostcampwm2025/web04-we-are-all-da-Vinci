import type { Stroke } from '@/entities/similarity';

export interface FinalResult {
  socketId: string;
  nickname: string;
  score: number;
}

export interface Highlight {
  promptStrokes: Stroke[];
  playerStrokes: Stroke[];
  similarity: number;
}

export interface GameEndResponse {
  finalRankings: FinalResult[];
  highlight: Highlight;
}
