import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { fn } from 'storybook/test';
import CommonBtn from './CommonBtn';

const meta = {
  title: 'shared/ui/CommonBtn',
  component: CommonBtn,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="w-80">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  argTypes: {
    variant: { control: 'inline-radio', options: ['scribble', 'radius'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    color: {
      control: 'select',
      options: ['blue', 'indigo', 'red', 'green', 'gray'],
    },
  },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof CommonBtn>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Scribble: Story = {
  args: {
    variant: 'scribble',
    icon: 'play_arrow',
    text: '게임 시작',
  },
};

export const Radius: Story = {
  args: {
    variant: 'radius',
    text: '확인',
    color: 'blue',
  },
};

export const Disabled: Story = {
  args: {
    variant: 'scribble',
    icon: 'check_circle',
    text: '확인',
    disabled: true,
  },
};

export const IconOnly: Story = {
  args: {
    variant: 'radius',
    icon: 'content_copy',
    ariaLabel: '방 코드 복사',
    size: 'md',
  },
  decorators: [
    (Story) => (
      <div className="w-12">
        <Story />
      </div>
    ),
  ],
};

export const Sizes: Story = {
  args: { variant: 'scribble', text: '버튼' },
  render: (args) => (
    <div className="flex flex-col gap-3">
      <div className="h-10">
        <CommonBtn {...args} size="sm" text="sm" />
      </div>
      <CommonBtn {...args} size="md" text="md" />
      <CommonBtn {...args} size="lg" text="lg" />
    </div>
  ),
};

export const RadiusColors: Story = {
  args: { variant: 'radius', size: 'md' },
  render: (args) => (
    <div className="flex flex-col gap-2">
      {['blue', 'indigo', 'red', 'green', 'gray'].map((color) => (
        <CommonBtn key={color} {...args} color={color} text={color} />
      ))}
    </div>
  ),
};
