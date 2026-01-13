import type { Stroke } from '@/entities/similarity';

export interface RoundResult {
  socketId: string;
  nickname: string;
  score: number;
  ranking: number;
  similarity: number;
  strokes: Stroke[];
}

export interface RoundEndResponse {
  rankings: RoundResult[];
  promptStrokes: Stroke[];
}
