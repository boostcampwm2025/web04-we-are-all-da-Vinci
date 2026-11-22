import type { Meta, StoryObj } from '@storybook/react-vite';
import RoundBadge from './RoundBadge';

const meta = {
  title: 'shared/ui/RoundBadge',
  component: RoundBadge,
} satisfies Meta<typeof RoundBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    round: 1,
  },
};
