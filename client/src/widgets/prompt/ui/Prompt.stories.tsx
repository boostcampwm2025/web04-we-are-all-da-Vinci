import type { Meta, StoryObj } from '@storybook/react-vite';
import { Prompt } from './Prompt';
import { useGameStore, initialState } from '@/entities/gameRoom/model';
import { MOCK_STROKES } from '@/test/mocks/mockGameStore';

interface StoryArgs {
  timer: number;
  currentRound: number;
  hasStrokes: boolean;
}

const meta: Meta<StoryArgs> = {
  title: 'Widgets/Prompt',
  component: Prompt,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    timer: { control: { type: 'range', min: 0, max: 60, step: 1 } },
    currentRound: { control: { type: 'range', min: 1, max: 5, step: 1 } },
    hasStrokes: { control: 'boolean', description: '제시어 스트로크 표시' },
  },
  render: (args) => {
    useGameStore.setState({
      ...initialState,
      isConnected: true,
      phase: 'PROMPT',
      timer: args.timer,
      currentRound: args.currentRound,
      promptStrokes: args.hasStrokes ? MOCK_STROKES : [],
    });
    return <Prompt />;
  },
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  args: { timer: 30, currentRound: 1, hasStrokes: true },
};
