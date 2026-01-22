import type { FinalResult, Highlight } from '@/entities/gameResult/model';
import type { Player } from '@/entities/player/model';
import type { RankingEntry } from '@/entities/ranking';
import type { RoundResult } from '@/entities/roundResult/model';
import type { Stroke } from '@/entities/similarity';
import { getSocket } from '@/shared/api';
import type { Phase } from '@/shared/config';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { GameRoom } from './types';

interface GameState extends GameRoom {
  // 소켓 연결 상태
  isConnected: boolean;

  // 실시간 데이터
  timer: number;
  liveRankings: RankingEntry[]; // 실시간 랭킹
  promptStrokes: Stroke[];

  // 결과 데이터
  roundResults: RoundResult[];
  finalResults: FinalResult[];
  highlight: Highlight | null;

  // Actions
  setConnected: (isConnected: boolean) => void;
  updateRoom: (room: Partial<GameRoom>) => void;
  setTimer: (timer: number) => void;
  setLiveRankings: (rankings: RankingEntry[]) => void;
  setPromptStrokes: (strokes: Stroke[]) => void;
  setRoundResults: (results: RoundResult[]) => void;
  setFinalResults: (results: FinalResult[]) => void;
  setHighlight: (highlight: Highlight) => void;
  reset: () => void;
}

const initialState = {
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
  finalResults: [],
  highlight: null,
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

      setFinalResults: (finalResults) => set({ finalResults }),

      setHighlight: (highlight) => set({ highlight }),

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
