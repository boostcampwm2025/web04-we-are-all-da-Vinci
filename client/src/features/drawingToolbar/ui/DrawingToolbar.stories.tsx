import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { DrawingToolbar } from './DrawingToolbar';

const meta = {
  title: 'features/drawingToolbar/DrawingToolbar',
  component: DrawingToolbar,
  parameters: {
    layout: 'centered',
  },
  args: {
    onColorSelect: fn(),
    onUndo: fn(),
    onClear: fn(),
    canUndo: true,
  },
} satisfies Meta<typeof DrawingToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    selectedColor: [0, 0, 0],
  },
};

export const RedSelected: Story = {
  args: {
    selectedColor: [239, 68, 68],
  },
};

export const BlueSelected: Story = {
  args: {
    selectedColor: [59, 130, 246],
  },
};

export const CannotUndo: Story = {
  args: {
    selectedColor: [0, 0, 0],
    canUndo: false,
  },
};
