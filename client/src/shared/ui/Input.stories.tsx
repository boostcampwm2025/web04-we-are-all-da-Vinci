import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import Input from './Input';

const meta = {
  title: 'shared/ui/Input',
  component: Input,
  decorators: [
    (Story) => (
      <div className="h-12 w-80">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    variant: { control: 'inline-radio', options: ['default', 'scribble'] },
  },
  args: {
    onEnter: fn(),
  },
  // 제어 컴포넌트라 value를 상태로 들고 있어야 입력이 반영된다
  render: function Render(args) {
    const [value, setValue] = useState(args.value ?? '');
    return (
      <Input
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next);
          args.onChange?.(next);
        }}
      />
    );
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: '방 코드를 입력하세요',
  },
};

export const Scribble: Story = {
  args: {
    variant: 'scribble',
    placeholder: '메시지를 입력하세요',
  },
};

export const WithCount: Story = {
  args: {
    placeholder: '닉네임',
    maxLength: 10,
    showCount: true,
    value: '다빈치',
  },
};
