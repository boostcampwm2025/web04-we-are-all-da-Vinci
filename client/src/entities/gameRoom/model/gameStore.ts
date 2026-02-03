import type { Player } from '@/entities/player';
import type { FinalResult, Highlight } from '@/entities/gameResult';
import type { RankingEntry } from '@/entities/ranking';
import type { PlayerScore, RoundResult } from '@/entities/roundResult';
import type { Stroke } from '@/entities/similarity';
import type { Phase } from '@/shared/config';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { GameRoom } from './types';

export interface GameState extends GameRoom {
  // 소켓 연결 상태
  isConnected: boolean;
  mySocketId: string | null;

  // 실시간 데이터
  timer: number;
  liveRankings: RankingEntry[]; // 실시간 랭킹
  promptStrokes: Stroke[];

  // 결과 데이터
  roundResults: RoundResult[];
  previousStandingResults: FinalResult[]; // 이전 라운드 스탠딩 (순위 변동 애니메이션용)
  standingResults: FinalResult[]; // 라운드 스탠딩 (누적 점수)
  finalResults: FinalResult[];
  highlight: Highlight | null;

  // 알림 상태
  alertMessage: string | null;
  pendingNavigation: string | null; // 모달 확인 후 이동할 경로

  // 대기열 및 연습모드 상태
  isInWaitlist: boolean;
  isPracticing: boolean;
  practicePrompt: Stroke[] | null;
  gameProgress: { currentRound: number; totalRounds: number };

  // Actions
  setMySocketId: (socketId: string | null) => void;
  setConnected: (isConnected: boolean) => void;
  updateRoom: (room: Partial<GameRoom>) => void;
  setTimer: (timer: number) => void;
  setLiveRankings: (rankings: RankingEntry[]) => void;
  setPromptStrokes: (strokes: Stroke[]) => void;
  setRoundResults: (results: RoundResult[]) => void;
  setStandingResults: (results: PlayerScore[]) => void;
  setFinalResults: (results: FinalResult[]) => void;
  setHighlight: (highlight: Highlight) => void;
  setAlertMessage: (message: string | null) => void;
  setPendingNavigation: (path: string | null) => void;

  // 대기열 전용 Actions
  setIsInWaitlist: (isInWaitlist: boolean) => void;
  setIsPracticing: (isPracticing: boolean) => void;
  setPracticePrompt: (strokes: Stroke[] | null) => void;
  setGameProgress: (progress: {
    currentRound: number;
    totalRounds: number;
  }) => void;

  reset: () => void;
}

export const initialState = {
  isConnected: false,
  mySocketId: null,
  roomId: '',
  players: [],
  phase: 'WAITING' as Phase,
  currentRound: 1,
  settings: {
    drawingTime: 90,
    totalRounds: 5,
    maxPlayer: 8,
  },
  timer: 0,
  liveRankings: [],
  promptStrokes: [],
  roundResults: [],
  previousStandingResults: [],
  standingResults: [],
  finalResults: [],
  highlight: null,
  alertMessage: null,
  pendingNavigation: null,

  isInWaitlist: false,
  isPracticing: false,
  practicePrompt: null,
  gameProgress: { currentRound: 0, totalRounds: 0 },
};

export const useGameStore = create<GameState>()(
  devtools(
    (set) => ({
      ...initialState,

      setMySocketId: (mySocketId) => set({ mySocketId }),

      setConnected: (isConnected) => set({ isConnected }),

      updateRoom: (room) => set((state) => ({ ...state, ...room })),

      setTimer: (timer) => set({ timer }),

      setLiveRankings: (liveRankings) => set({ liveRankings }),

      setPromptStrokes: (promptStrokes) => set({ promptStrokes }),

      setRoundResults: (roundResults) => set({ roundResults }),

      setStandingResults: (standingResults) =>
        set((state) => ({
          previousStandingResults: state.standingResults,
          standingResults,
        })),

      setFinalResults: (finalResults) => set({ finalResults }),

      setHighlight: (highlight) => set({ highlight }),

      setAlertMessage: (alertMessage) => set({ alertMessage }),

      setPendingNavigation: (pendingNavigation) => set({ pendingNavigation }),

      setIsInWaitlist: (isInWaitlist) => set({ isInWaitlist }),

      setIsPracticing: (isPracticing) => set({ isPracticing }),

      setPracticePrompt: (practicePrompt) => set({ practicePrompt }),

      setGameProgress: (gameProgress) => set({ gameProgress }),

      reset: () => set(initialState),
    }),
    { name: 'Game Store' },
  ),
);

// Selectors (재사용 가능)
export const selectPlayers = (state: GameState) => state.players;
export const selectSettings = (state: GameState) => state.settings;
export const selectPhase = (state: GameState) => state.phase;
export const selectLiveRankings = (state: GameState) => state.liveRankings;
export const selectTimer = (state: GameState) => state.timer;

// Helper: 현재 플레이어 찾기 (스토어의 mySocketId 기반)
export const useCurrentPlayer = (): Player | null => {
  const players = useGameStore(selectPlayers);
  const mySocketId = useGameStore((state) => state.mySocketId);

  if (!mySocketId) return null;

  return players.find((p) => p.socketId === mySocketId) || null;
};

// Helper: 호스트 여부 확인
export const useIsHost = (): boolean => {
  const currentPlayer = useCurrentPlayer();
  return currentPlayer?.isHost ?? false;
};

// Helper: 특정 socketId가 현재 유저인지 확인
export const useIsCurrentUser = (socketId: string): boolean => {
  const mySocketId = useGameStore((state) => state.mySocketId);

  return mySocketId === socketId;
};

// Helper: 현재 플레이어의 등수 계산 (displayResults 기준)
export const useMyRank = (displayResults: PlayerScore[]): number => {
  const currentPlayer = useCurrentPlayer();

  if (!currentPlayer) return -1;

  const index = displayResults.findIndex(
    (p) => p.socketId === currentPlayer.socketId,
  );

  return index !== -1 ? index + 1 : -1;
};
