import type { Meta, StoryObj } from '@storybook/react-vite';
import { Drawing } from './Drawing';
import { withMockGameStore } from '@/test/mocks/mockGameStore';

const meta = {
  title: 'Widgets/Drawing',
  component: Drawing,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    withMockGameStore({
      phase: 'DRAWING',
      currentRound: 1,
      timer: 90,
      liveRankings: [],
    }),
  ],
} satisfies Meta<typeof Drawing>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 기본 그림 그리기 화면
 * - 1라운드, 90초 타이머
 * - 빈 캔버스 상태
 */
export const Default: Story = {};

/**
 * 3라운드 그림 그리기 화면
 */
export const Round3: Story = {
  decorators: [
    withMockGameStore({
      phase: 'DRAWING',
      currentRound: 3,
      timer: 45,
    }),
  ],
};
