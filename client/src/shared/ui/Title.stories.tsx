import type { Meta, StoryObj } from '@storybook/react-vite';
import Title from './Title';

const meta = {
  title: 'shared/ui/Title',
  component: Title,
} satisfies Meta<typeof Title>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: '우리 모두 다빈치',
    fontSize: 'text-5xl',
  },
};

export const Small: Story = {
  args: {
    title: '우리 모두 다빈치',
    fontSize: 'text-2xl',
  },
};
