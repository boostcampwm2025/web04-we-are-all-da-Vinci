import type { Meta, StoryObj } from '@storybook/react-vite';
import { RoundReplay } from './RoundReplay';
import {
  withMockGameStore,
  createMockRoundResults,
  MOCK_STROKES,
} from '@/test/mocks/mockGameStore';

const meta = {
  title: 'Widgets/RoundReplay',
  component: RoundReplay,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    withMockGameStore({
      phase: 'ROUND_REPLAY',
      currentRound: 1,
      timer: 15,
      roundResults: createMockRoundResults(4),
      promptStrokes: MOCK_STROKES,
    }),
  ],
} satisfies Meta<typeof RoundReplay>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 기본 라운드 리플레이 화면
 * - 1라운드 결과
 * - 4명의 플레이어 리플레이 표시
 */
export const Default: Story = {};

/**
 * 30명의 플레이어 리플레이 (스크롤 테스트용)
 */
export const ManyPlayers: Story = {
  decorators: [
    withMockGameStore({
      phase: 'ROUND_REPLAY',
      currentRound: 3,
      timer: 15,
      roundResults: createMockRoundResults(30),
      promptStrokes: MOCK_STROKES,
    }),
  ],
};
