import type { Decorator } from '@storybook/react-vite';
import { useGameStore } from '@/entities/gameRoom/model';
import type { Player } from '@/entities/player/model';
import type { RankingEntry } from '@/entities/ranking';
import type { RoundResult, PlayerScore } from '@/entities/roundResult/model';
import type { FinalResult, Highlight } from '@/entities/gameResult/model';
import type { Stroke } from '@/entities/similarity';
import type { Similarity } from '@/features/similarity';
import type { Phase } from '@/shared/config';
import { MOCK_STROKES } from './mockStrokes';

// Mock Stroke 데이터
export { MOCK_STROKES };

// Mock Similarity 데이터
export const MOCK_SIMILARITY: Similarity = {
  similarity: 85.5,
  strokeCountSimilarity: 90,
  strokeMatchSimilarity: 80,
  shapeSimilarity: 86.5,
};

// Mock Highlight 데이터 (GameEnd POTG용)
export const MOCK_HIGHLIGHT: Highlight = {
  promptStrokes: MOCK_STROKES,
  playerStrokes: MOCK_STROKES,
  similarity: MOCK_SIMILARITY,
};

// 기본 게임 설정
export const MOCK_SETTINGS = {
  drawingTime: 90,
  totalRounds: 5,
  maxPlayer: 8,
};

// Mock 데이터 생성 유틸리티
export const createMockPlayers = (count: number): Player[] =>
  Array.from({ length: count }, (_, i) => ({
    socketId: `socket-${i + 1}`,
    nickname: `플레이어 ${i + 1}`,
    profileId: `profile-${(i % 8) + 1}`,
    isHost: i === 0,
  }));

export const createMockStandingResults = (
  count: number,
  baseScore = 1000,
): PlayerScore[] =>
  Array.from({ length: count }, (_, i) => ({
    socketId: `socket-${i + 1}`,
    nickname: `플레이어 ${i + 1}`,
    profileId: `profile-${(i % 8) + 1}`,
    score: baseScore - i * 30,
  }));

export const createMockFinalResults = (count: number): FinalResult[] =>
  Array.from({ length: count }, (_, i) => ({
    socketId: `socket-${i + 1}`,
    nickname: `플레이어 ${i + 1}`,
    profileId: `profile-${(i % 8) + 1}`,
    score: 1000 - i * 30,
  }));

export const createMockRoundResults = (count: number): RoundResult[] =>
  Array.from({ length: count }, (_, i) => ({
    socketId: `socket-${i + 1}`,
    nickname: `플레이어 ${i + 1}`,
    profileId: `profile-${(i % 8) + 1}`,
    score: 100 - i * 10,
    ranking: i + 1,
    similarity: { ...MOCK_SIMILARITY, similarity: 90 - i * 5 },
    strokes: MOCK_STROKES,
  }));

export const createMockLiveRankings = (count: number): RankingEntry[] =>
  Array.from({ length: count }, (_, i) => ({
    socketId: `socket-${i + 1}`,
    nickname: `플레이어 ${i + 1}`,
    profileId: `profile-${(i % 8) + 1}`,
    similarity: 90 - i * 5,
    rank: i + 1,
    previousRank: i === 0 ? null : i,
  }));

// Storybook Decorator: Zustand 스토어에 Mock 상태 주입
interface MockGameState {
  isConnected?: boolean;
  roomId?: string;
  players?: Player[];
  phase?: Phase;
  currentRound?: number;
  settings?: typeof MOCK_SETTINGS;
  timer?: number;
  liveRankings?: RankingEntry[];
  promptStrokes?: Stroke[];
  roundResults?: RoundResult[];
  previousStandingResults?: FinalResult[];
  standingResults?: FinalResult[];
  finalResults?: FinalResult[];
  highlight?: Highlight | null;
}

export const withMockGameStore = (initialState: MockGameState = {}): Decorator => {
  return (Story) => {
    // 스토리 렌더링 전에 스토어 상태 설정
    useGameStore.setState({
      isConnected: true,
      roomId: 'mock-room-123',
      players: createMockPlayers(4),
      phase: 'WAITING',
      currentRound: 1,
      settings: MOCK_SETTINGS,
      timer: 90,
      liveRankings: [],
      promptStrokes: MOCK_STROKES,
      roundResults: [],
      previousStandingResults: [],
      standingResults: [],
      finalResults: [],
      highlight: null,
      alertMessage: null,
      pendingNavigation: null,
      ...initialState,
    });

    return <Story />;
  };
};
