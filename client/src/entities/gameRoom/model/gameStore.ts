import type { FinalResult } from '@/entities/gameResult/model';
import type { RoundResult } from '@/entities/roundResult/model';
import type { Phase } from '@/shared/config';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { GameRoom } from './types';
import type { Player } from '@/entities/player/model';
import { getSocket } from '@/shared/api/socket';

interface GameState extends GameRoom {
  // 소켓 연결 상태
  isConnected: boolean;

  // 실시간 데이터
  timer: number;
  liveScores: Record<string, number>; // socketId -> 유사도
  promptImage: string; // TODO: promptImage 기능 완성되면 연동할 예정

  // 결과 데이터
  roundResults: RoundResult[];
  finalResults: FinalResult[];

  // Actions
  setConnected: (isConnected: boolean) => void;
  updateRoom: (room: Partial<GameRoom>) => void;
  setTimer: (timer: number) => void;
  setLiveScores: (scores: Record<string, number>) => void;
  setPromptImage: (imageUrl: string) => void;
  setRoundResults: (results: RoundResult[]) => void;
  setFinalResults: (results: FinalResult[]) => void;
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
  liveScores: {},
  promptImage: '', // TODO: promptImage 기능 완성되면 연동할 예정
  roundResults: [],
  finalResults: [],
};

export const useGameStore = create<GameState>()(
  devtools(
    (set) => ({
      ...initialState,

      setConnected: (isConnected) => set({ isConnected }),

      updateRoom: (room) => set((state) => ({ ...state, ...room })),

      setTimer: (timer) => set({ timer }),

      setLiveScores: (liveScores) => set({ liveScores }),

      setPromptImage: (promptImage) => set({ promptImage }),

      setRoundResults: (roundResults) => set({ roundResults }),

      setFinalResults: (finalResults) => set({ finalResults }),

      reset: () => set(initialState),
    }),
    { name: 'Game Store' },
  ),
);

// Selectors (재사용 가능)
export const selectPlayers = (state: GameState) => state.players;
export const selectSettings = (state: GameState) => state.settings;
export const selectPhase = (state: GameState) => state.phase;
export const selectLiveScores = (state: GameState) => state.liveScores;
export const selectTimer = (state: GameState) => state.timer;

// Helper: 현재 플레이어 찾기
export const useCurrentPlayer = (): Player | null => {
  const players = useGameStore(selectPlayers);
  const nickname = localStorage.getItem('nickname');
  return players.find((p) => p.nickname === nickname) || null;
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
