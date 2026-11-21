import type { Meta, StoryObj } from '@storybook/react-vite';
import { GameHeader } from './GameHeader';

const meta = {
  title: 'shared/ui/GameHeader',
  component: GameHeader,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof GameHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: '대기실',
  },
};

export const WithRound: Story = {
  args: {
    title: '그림을 기억하세요!',
    round: 2,
    description: '잠시 후 그림이 사라져요',
  },
};

export const WithDecoration: Story = {
  args: {
    title: '최종 결과',
    showDecoration: true,
  },
};

export const WithoutLogo: Story = {
  args: {
    title: '라운드 결과',
    round: 3,
    showLogo: false,
  },
};
