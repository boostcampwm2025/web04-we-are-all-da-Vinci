import type { Meta, StoryObj } from '@storybook/react-vite';
import { GameEnd } from './GameEnd';
import { useGameStore } from '@/entities/gameRoom/model';
import { useEffect } from 'react';
import type { FinalResult, Highlight } from '@/entities/gameResult/model';
import type { Stroke } from '@/entities/similarity';

const mockFinalResults: FinalResult[] = [
  {
    socketId: 'user1',
    nickname: '다빈치',
    profileId: '1',
    score: 2500,
  },
  {
    socketId: 'user2',
    nickname: '피카소',
    profileId: '2',
    score: 2100,
  },
  {
    socketId: 'user3',
    nickname: '고흐',
    profileId: '3',
    score: 1850,
  },
  {
    socketId: 'user4',
    nickname: '미켈란젤로',
    profileId: '4',
    score: 1500,
  },
];

const dummyStroke: Stroke = {
  points: [
    [100, 150, 200, 250, 300],
    [100, 120, 150, 200, 250],
  ],
  color: [0, 0, 0],
};

const mockHighlight: Highlight = {
  promptStrokes: [dummyStroke],
  playerStrokes: [dummyStroke],
  similarity: {
    similarity: 98.5,
    strokeCountSimilarity: 100,
    strokeMatchSimilarity: 97,
    shapeSimilarity: 98.5,
  },
};

const meta = {
  title: 'widgets/GameEnd',
  component: GameEnd,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => {
      useEffect(() => {
        useGameStore.setState({
          isConnected: true,
          roomId: 'room-123',
          finalResults: mockFinalResults,
          highlight: mockHighlight,
          timer: 15,
          settings: {
            drawingTime: 90,
            totalRounds: 5,
            maxPlayer: 8,
          },
          players: [
            {
              socketId: 'user1',
              nickname: '다빈치',
              profileId: '1',
              isHost: true,
            },
            {
              socketId: 'user2',
              nickname: '피카소',
              profileId: '2',
              isHost: false,
            },
          ],
        });
      }, []);
      return <Story />;
    },
  ],
} satisfies Meta<typeof GameEnd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'responsive',
    },
  },
};

export const Tablet: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'ipad',
    },
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'iphone14',
    },
  },
};

export const NoHighlight: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        useGameStore.setState({
          highlight: null,
          timer: 5,
        });
      }, []);
      return <Story />;
    },
  ],
};
