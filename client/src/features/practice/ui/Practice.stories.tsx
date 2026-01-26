import type { Meta, StoryObj } from '@storybook/react-vite';
import { Practice } from './Practice';
import { useGameStore } from '@/entities/gameRoom/model';
import { useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';

const meta = {
  title: 'features/practice/Practice',
  component: Practice,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
    (Story) => {
      // Storybook에서 Zustand 상태를 강제로 주입하기 위한 데코레이터
      useEffect(() => {
        useGameStore.setState({
          isPracticing: true,
          practicePrompt: [
            {
              points: [
                [
                  90, 84, 70, 39, 27, 23, 1, 0, 4, 41, 57, 102, 133, 147, 176,
                  213, 231, 242, 246, 245, 232, 214, 191, 160, 122, 94, 90, 88,
                ],
                [
                  73, 61, 56, 56, 62, 64, 124, 174, 184, 240, 248, 248, 255,
                  255, 241, 219, 193, 166, 149, 124, 97, 75, 62, 60, 80, 78, 75,
                  69,
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
          ],
        });
      }, []);

      return <Story />;
    },
  ],
} satisfies Meta<typeof Practice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
