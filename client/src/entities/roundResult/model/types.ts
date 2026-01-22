import type { Stroke } from '@/entities/similarity';
import type { Similarity } from '@/features/similarity';

export interface RoundResult {
  socketId: string;
  nickname: string;
  profileId: string;
  score: number;
  ranking: number;
  similarity: Similarity;
  strokes: Stroke[];
}

export interface RoundReplayResponse {
  rankings: RoundResult[];
  promptStrokes: Stroke[];
}

export interface RoundStandingResponse {
  rankings: {
    socketId: string;
    nickname: string;
    profileId: string;
    score: number;
  }[];
}
