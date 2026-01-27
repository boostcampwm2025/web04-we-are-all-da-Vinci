import type { FinalResult, Highlight } from '@/entities/gameResult/model';
import type { Player } from '@/entities/player/model';
import type { RankingEntry } from '@/entities/ranking';
import type { RoundResult, PlayerScore } from '@/entities/roundResult/model';
import type { Stroke } from '@/entities/similarity';
import { getSocket } from '@/shared/api';
import type { Phase } from '@/shared/config';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { GameRoom } from './types';

export interface GameState extends GameRoom {
  // 소켓 연결 상태
  isConnected: boolean;

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

  // Actions
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
  reset: () => void;
}

export const initialState = {
  isConnected: false,
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
};

export const useGameStore = create<GameState>()(
  devtools(
    (set) => ({
      ...initialState,

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

// Helper: 현재 플레이어 찾기 (소켓 ID 기반)
export const useCurrentPlayer = (): Player | null => {
  const players = useGameStore(selectPlayers);
  const isConnected = useGameStore((state) => state.isConnected);

  if (!isConnected) return null;

  const socket = getSocket();

  const mySocketId =
    socket && 'connected' in socket && socket.connected && socket.id
      ? socket.id
      : undefined;

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
  const isConnected = useGameStore((state) => state.isConnected);

  if (!isConnected) return false;

  const socket = getSocket();
  const mySocketId = socket?.id;

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
