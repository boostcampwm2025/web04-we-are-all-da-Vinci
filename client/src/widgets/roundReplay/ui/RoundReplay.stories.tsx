import type { Meta, StoryObj } from '@storybook/react-vite';
import RoundReplay from './RoundReplay';
import { useGameStore, initialState } from '@/entities/gameRoom/model';
import { createMockRoundResults, MOCK_STROKES } from '@/test/mocks/mockData';

interface StoryArgs {
  resultCount: number;
}

const meta: Meta<StoryArgs> = {
  title: 'Widgets/RoundReplay',
  component: RoundReplay,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    resultCount: { control: { type: 'range', min: 1, max: 30, step: 1 } },
  },
  render: (args) => {
    useGameStore.setState({
      ...initialState,
      isConnected: true,
      phase: 'ROUND_REPLAY',
      currentRound: 1,
      timer: 15,
      roundResults: createMockRoundResults(args.resultCount),
      promptStrokes: MOCK_STROKES,
    });
    return <RoundReplay />;
  },
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  args: { resultCount: 4 },
};

export const ManyPlayers: Story = {
  args: { resultCount: 30 },
};
