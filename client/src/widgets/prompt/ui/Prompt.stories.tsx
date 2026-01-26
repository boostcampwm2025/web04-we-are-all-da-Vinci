import type { Meta, StoryObj } from '@storybook/react-vite';
import { Prompt } from './Prompt';
import { withMockGameStore, MOCK_STROKES } from '@/test/mocks/mockGameStore';

const meta = {
  title: 'Widgets/Prompt',
  component: Prompt,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    withMockGameStore({
      phase: 'PROMPT',
      currentRound: 1,
      timer: 5,
      promptStrokes: MOCK_STROKES,
    }),
  ],
} satisfies Meta<typeof Prompt>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 기본 제시어 화면
 * - 1라운드, 5초 타이머
 * - 샘플 제시어 이미지 표시
 */
export const Default: Story = {};

/**
 * 마지막 라운드 제시어 화면
 */
export const FinalRound: Story = {
  decorators: [
    withMockGameStore({
      phase: 'PROMPT',
      currentRound: 5,
      timer: 5,
      promptStrokes: MOCK_STROKES,
    }),
  ],
};
