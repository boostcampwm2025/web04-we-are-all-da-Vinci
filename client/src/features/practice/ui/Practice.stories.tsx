import type { Meta, StoryObj } from '@storybook/react-vite';
import { Practice } from './Practice';
import { useGameStore } from '@/entities/gameRoom';
import { useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { MOCK_STROKES } from '@/test/mocks/mockStrokes';

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
          practicePrompt: MOCK_STROKES,
        });
      }, []);

      return <Story />;
    },
  ],
} satisfies Meta<typeof Practice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
