import type { Meta, StoryObj } from '@storybook/react-vite';
import { GameEnd } from './GameEnd';
import {
  withMockGameStore,
  createMockFinalResults,
  MOCK_HIGHLIGHT,
  MOCK_SETTINGS,
} from '@/test/mocks/mockGameStore';

const meta = {
  title: 'Widgets/GameEnd',
  component: GameEnd,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    withMockGameStore({
      phase: 'GAME_END',
      timer: 30,
      finalResults: createMockFinalResults(4),
      highlight: MOCK_HIGHLIGHT,
      settings: MOCK_SETTINGS,
    }),
  ],
} satisfies Meta<typeof GameEnd>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 기본 게임 종료 화면
 * - 4명의 플레이어 포디움
 * - POTG 하이라이트 표시
 */
export const Default: Story = {};

/**
 * 하이라이트 없는 게임 종료 화면
 */
export const NoHighlight: Story = {
  decorators: [
    withMockGameStore({
      phase: 'GAME_END',
      timer: 30,
      finalResults: createMockFinalResults(4),
      highlight: null,
      settings: MOCK_SETTINGS,
    }),
  ],
};

/**
 * 30명의 플레이어 (스크롤 테스트용)
 */
export const ManyPlayers: Story = {
  decorators: [
    withMockGameStore({
      phase: 'GAME_END',
      timer: 30,
      finalResults: createMockFinalResults(30),
      highlight: MOCK_HIGHLIGHT,
      settings: MOCK_SETTINGS,
    }),
  ],
};
