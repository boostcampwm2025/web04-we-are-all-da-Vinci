import type { Decorator } from '@storybook/react-vite';
import {
  useGameStore,
  initialState,
  type GameState,
} from '@/entities/gameRoom/model';
import { MOCK_STROKES, createMockPlayers } from './mockData';

// 기본 Mock State
export const DEFAULT_GAME_STATE: Partial<GameState> = {
  ...initialState,
  isConnected: true,
  roomId: 'mock-room-123',
  players: createMockPlayers(4),
  timer: 30,
  promptStrokes: MOCK_STROKES,
};

// Storybook Decorator
export const withMockGameStore = (
  overrides: Partial<GameState> = {},
): Decorator => {
  return (Story) => {
    useGameStore.setState({ ...DEFAULT_GAME_STATE, ...overrides });
    return <Story />;
  };
};
