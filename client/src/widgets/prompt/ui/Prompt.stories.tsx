import type { Meta, StoryObj } from '@storybook/react-vite';
import { Prompt } from './Prompt';
import { useGameStore } from '@/entities/gameRoom/model';
import { useEffect } from 'react';
import type { Stroke } from '@/entities/similarity';

// 공통 더미 데이터
const mockStrokes: Stroke[] = [
  {
    points: [
      [
        90, 84, 70, 39, 27, 23, 1, 0, 4, 41, 57, 102, 133, 147, 176, 213, 231,
        242, 246, 245, 232, 214, 191, 160, 122, 94, 90, 88,
      ],
      [
        73, 61, 56, 56, 62, 64, 124, 174, 184, 240, 248, 248, 255, 255, 241,
        219, 193, 166, 149, 124, 97, 75, 62, 60, 80, 78, 75, 69,
      ],
    ],
    color: [239, 68, 68],
  },
  {
    points: [
      [104, 112, 118, 116],
      [72, 30, 25, 78],
    ],
    color: [0, 0, 0],
  },
  {
    points: [
      [103, 99, 83, 65, 56, 57, 68, 81],
      [59, 46, 25, 12, 0, 38, 55, 59],
    ],
    color: [34, 197, 94],
  },
];

const meta = {
  title: 'widgets/Prompt',
  component: Prompt,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => {
      useEffect(() => {
        // 스토리 로드시 상태 초기화
        useGameStore.setState({
          promptStrokes: mockStrokes,
          currentRound: 1,
          timer: 10,
          isConnected: true,
        });
      }, []);
      return <Story />;
    },
  ],
} satisfies Meta<typeof Prompt>;

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

// 4. 긴 라운드 및 다른 데이터 케이스
export const Round10: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        useGameStore.setState({
          promptStrokes: mockStrokes,
          currentRound: 10,
          timer: 5,
        });
      }, []);
      return <Story />;
    },
  ],
};
