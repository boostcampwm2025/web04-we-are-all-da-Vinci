import { initialState, useGameStore } from '@/entities/gameRoom';
import { getSocket } from '@/shared/api';
import {
  createMockPlayers,
  createMockRoundResults,
  MOCK_STROKES,
} from '@/test/mocks/mockData';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import RoundReplay from './RoundReplay';

interface StoryArgs {
  resultCount: number;
}

const RoundReplayStory = (args: StoryArgs) => {
  useEffect(() => {
    // 소켓 ID 모킹 (useCurrentPlayer용)
    const socket = getSocket();
    Object.defineProperty(socket, 'id', {
      value: 'socket-1',
      configurable: true,
    });
    Object.defineProperty(socket, 'connected', {
      value: true,
      configurable: true,
    });

    useGameStore.setState({
      ...initialState,
      isConnected: true,
      phase: 'ROUND_REPLAY',
      currentRound: 1,
      timer: 15,
      players: createMockPlayers(args.resultCount),
      roundResults: createMockRoundResults(args.resultCount),
      promptStrokes: MOCK_STROKES,
    });
  }, [args.resultCount]);

  return <RoundReplay />;
};

const meta: Meta<StoryArgs> = {
  title: 'Widgets/RoundReplay',
  component: RoundReplay,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    resultCount: { control: { type: 'range', min: 1, max: 30, step: 1 } },
  },
  render: (args) => <RoundReplayStory {...args} />,
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  args: { resultCount: 4 },
};

export const ManyPlayers: Story = {
  args: { resultCount: 30 },
};
