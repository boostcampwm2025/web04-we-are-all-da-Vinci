import type { Stroke } from '@/entities/similarity';
import type { Similarity } from '@/features/similarity';

export interface RoundResult {
  socketId: string;
  nickname: string;
  score: number;
  ranking: number;
  similarity: Similarity;
  strokes: Stroke[];
}

export interface RoundEndResponse {
  rankings: RoundResult[];
  promptStrokes: Stroke[];
}
