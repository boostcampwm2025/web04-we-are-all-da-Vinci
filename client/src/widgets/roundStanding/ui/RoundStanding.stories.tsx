import { initialState, useGameStore } from '@/entities/gameRoom';
import { createMockStandingResults } from '@/test/mocks/mockData';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { RoundStanding } from './RoundStanding';

interface StoryArgs {
  resultCount: number;
}

const meta: Meta<StoryArgs> = {
  title: 'Widgets/RoundStanding',
  component: RoundStanding,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    resultCount: { control: { type: 'range', min: 1, max: 30, step: 1 } },
  },
  render: (args) => {
    useGameStore.setState({
      ...initialState,
      isConnected: true,
      phase: 'ROUND_STANDING',
      currentRound: 1,
      timer: 10,
      standingResults: createMockStandingResults(args.resultCount),
      previousStandingResults: [],
    });
    return <RoundStanding />;
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
