import type { Meta, StoryObj } from '@storybook/react-vite';
import { GameEnd } from './GameEnd';
import { useGameStore, initialState } from '@/entities/gameRoom/model';
import {
  createMockFinalResults,
  MOCK_HIGHLIGHT,
  MOCK_SETTINGS,
} from '@/test/mocks/mockData';

interface StoryArgs {
  resultCount: number;
  hasHighlight: boolean;
}

const meta: Meta<StoryArgs> = {
  title: 'Widgets/GameEnd',
  component: GameEnd,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    resultCount: { control: { type: 'range', min: 1, max: 30, step: 1 } },
    hasHighlight: { control: 'boolean', description: 'POTG 하이라이트 표시' },
  },
  render: (args) => {
    useGameStore.setState({
      ...initialState,
      isConnected: true,
      phase: 'GAME_END',
      timer: 30,
      finalResults: createMockFinalResults(args.resultCount),
      highlight: args.hasHighlight ? MOCK_HIGHLIGHT : null,
      settings: MOCK_SETTINGS,
    });
    return <GameEnd />;
  },
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  args: { resultCount: 4, hasHighlight: true },
};

export const NoHighlight: Story = {
  args: { resultCount: 4, hasHighlight: false },
};
