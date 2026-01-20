import type { Stroke } from '@/entities/similarity';
import type { Similarity } from '@/features/similarity';

export interface FinalResult {
  socketId: string;
  nickname: string;
  score: number;
}

export interface Highlight {
  promptStrokes: Stroke[];
  playerStrokes: Stroke[];
  similarity: Similarity;
}

export interface GameEndResponse {
  finalRankings: FinalResult[];
  highlight: Highlight;
}
