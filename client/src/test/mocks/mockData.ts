import type { FinalResult, Highlight } from '@/entities/gameResult';
import type { Player } from '@/entities/player/model';
import type { RankingEntry } from '@/entities/ranking';
import type { PlayerScore, RoundResult } from '@/entities/roundResult';
import type { Similarity } from '@/features/similarity';
import { MOCK_STROKES } from './mockStrokes';

export { MOCK_STROKES };

// 기본 플레이어 정보 생성
const createPlayerBase = (index: number) => ({
  socketId: `socket-${index + 1}`,
  nickname: `플레이어 ${index + 1}`,
  profileId: `profile-${(index % 8) + 1}`,
});

// 0~100 사이 유사도 생성 (순위가 낮을수록 낮은 유사도)
const createSimilarity = (index: number, count: number): number =>
  Math.round(100 - (index / Math.max(count - 1, 1)) * 50); // 100 ~ 50 사이

export const MOCK_SIMILARITY: Similarity = {
  similarity: 85.5,
  strokeCountSimilarity: 90,
  strokeMatchSimilarity: 80,
  shapeSimilarity: 86.5,
};

export const MOCK_HIGHLIGHT: Highlight = {
  promptStrokes: MOCK_STROKES,
  playerStrokes: MOCK_STROKES,
  similarity: MOCK_SIMILARITY,
};

export const MOCK_SETTINGS = {
  drawingTime: 90,
  totalRounds: 5,
  maxPlayer: 8,
};

export const createMockPlayers = (count: number): Player[] =>
  Array.from({ length: count }, (_, i) => ({
    ...createPlayerBase(i),
    isHost: i === 0,
  }));

export const createMockStandingResults = (
  count: number,
  baseScore = 1000,
): PlayerScore[] =>
  Array.from({ length: count }, (_, i) => ({
    ...createPlayerBase(i),
    score: baseScore - i * 30,
  }));

export const createMockFinalResults = (count: number): FinalResult[] =>
  Array.from({ length: count }, (_, i) => ({
    ...createPlayerBase(i),
    score: 1000 - i * 30,
  }));

export const createMockRoundResults = (count: number): RoundResult[] =>
  Array.from({ length: count }, (_, i) => ({
    ...createPlayerBase(i),
    score: 100 - Math.round((i / Math.max(count - 1, 1)) * 80),
    ranking: i + 1,
    similarity: { ...MOCK_SIMILARITY, similarity: createSimilarity(i, count) },
    strokes: MOCK_STROKES,
  }));

export const createMockLiveRankings = (count: number): RankingEntry[] =>
  Array.from({ length: count }, (_, i) => ({
    ...createPlayerBase(i),
    similarity: createSimilarity(i, count),
    rank: i + 1,
    previousRank: i === 0 ? null : i,
  }));
