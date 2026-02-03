import type {
  Stroke,
  Similarity,
  PlayerScore as SharedPlayerScore,
} from '@shared/types';

// Re-export base type
export type PlayerScore = SharedPlayerScore;

// Extended type with ranking for client display
export interface RoundResult extends PlayerScore {
  ranking: number;
  similarity: Similarity;
  strokes: Stroke[];
}

export interface RoundReplayResponse {
  rankings: RoundResult[];
  promptStrokes: Stroke[];
}

export interface RoundStandingResponse {
  rankings: PlayerScore[];
}
