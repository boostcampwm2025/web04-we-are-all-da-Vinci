import type { Meta, StoryObj } from '@storybook/react-vite';
import { Drawing } from './Drawing';
import { useGameStore } from '@/entities/gameRoom/model';
import { useEffect } from 'react';
import type { RankingEntry } from '@/entities/ranking';

// 공통 더미 데이터
const mockLiveRankings: RankingEntry[] = [
  {
    socketId: 'user1',
    nickname: '다빈치',
    profileId: '1',
    similarity: 95.5,
    rank: 1,
    previousRank: 2,
  },
  {
    socketId: 'user2',
    nickname: '피카소',
    profileId: '2',
    similarity: 88.2,
    rank: 2,
    previousRank: 1,
  },
  {
    socketId: 'user3',
    nickname: '고흐',
    profileId: '3',
    similarity: 75.0,
    rank: 3,
    previousRank: 3,
  },
  {
    socketId: 'user4',
    nickname: '미켈란젤로',
    profileId: '4',
    similarity: 62.1,
    rank: 4,
    previousRank: null,
  },
];

const meta = {
  title: 'widgets/Drawing',
  component: Drawing,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => {
      useEffect(() => {
        // 스토리 로드시 상태 초기화
        useGameStore.setState({
          currentRound: 3,
          timer: 45,
          liveRankings: mockLiveRankings,
          isConnected: true,
        });
      }, []);
      return <Story />;
    },
  ],
} satisfies Meta<typeof Drawing>;

export default meta;
type Story = StoryObj<typeof meta>;

// 1. 데스크탑 뷰 (기본)
export const Desktop: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'responsive',
    },
  },
};

// 2. 태블릿 뷰 (iPad)
export const Tablet: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'ipad',
    },
  },
};

// 3. 모바일 뷰 (iPhone 14)
export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'iphone14',
    },
  },
};
