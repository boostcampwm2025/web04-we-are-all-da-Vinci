import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import { Drawing } from './Drawing';
import { useGameStore, initialState } from '@/entities/gameRoom/model';
import { createMockLiveRankings, MOCK_STROKES } from '@/test/mocks/mockData';

interface StoryArgs {
  rankingCount: number;
}

const StoryWrapper = ({ rankingCount }: StoryArgs) => {
  useEffect(() => {
    useGameStore.setState({
      ...initialState,
      isConnected: true,
      phase: 'DRAWING',
      currentRound: 1,
      timer: 90,
      promptStrokes: MOCK_STROKES,
      liveRankings:
        rankingCount > 0 ? createMockLiveRankings(rankingCount) : [],
    });
  }, [rankingCount]);

  return <Drawing />;
};

const meta: Meta<StoryArgs> = {
  title: 'Widgets/Drawing',
  component: Drawing,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    rankingCount: { control: { type: 'range', min: 0, max: 30, step: 1 } },
  },
  render: (args) => <StoryWrapper {...args} />,
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  args: { rankingCount: 4 },
};
