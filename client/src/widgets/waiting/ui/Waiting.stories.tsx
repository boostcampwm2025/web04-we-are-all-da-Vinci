import { initialState, useGameStore } from '@/entities/gameRoom';
import { createMockPlayers, MOCK_SETTINGS } from '@/test/mocks/mockData';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { Waiting } from './Waiting';

interface StoryArgs {
  playerCount: number;
}

const meta: Meta<StoryArgs> = {
  title: 'Widgets/Waiting',
  component: Waiting,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    playerCount: { control: { type: 'range', min: 1, max: 30, step: 1 } },
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: (args) => {
    useGameStore.setState({
      ...initialState,
      isConnected: true,
      phase: 'WAITING',
      players: createMockPlayers(args.playerCount),
      settings: MOCK_SETTINGS,
      roomId: 'ABC123',
    });
    return <Waiting />;
  },
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  args: { playerCount: 4 },
};

export const ManyPlayers: Story = {
  args: { playerCount: 20 },
};
