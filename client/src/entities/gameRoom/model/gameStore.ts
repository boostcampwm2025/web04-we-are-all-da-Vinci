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
  myProfileId: string | null;

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
  setMyProfileId: (profileId: string | null) => void;
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
  myProfileId: null,
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

      setMyProfileId: (myProfileId) => set({ myProfileId }),
      updateRoom: (room) => {
        set((state) => {
          if (room.phase) {
            localStorage.setItem('last_game_phase', room.phase);
          }
          return { ...state, ...room };
        });
      },

      setConnected: (isConnected) => set({ isConnected }),

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
