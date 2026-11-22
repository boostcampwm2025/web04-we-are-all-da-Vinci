import type { Meta, StoryObj } from '@storybook/react-vite';
import Loading from './Loading';

const meta = {
  title: 'shared/ui/Loading',
  component: Loading,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
