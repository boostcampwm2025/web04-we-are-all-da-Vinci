import type { Meta, StoryObj } from '@storybook/react-vite';
import UserAvatar from './UserAvatar';

const meta = {
  title: 'shared/ui/UserAvatar',
  component: UserAvatar,
  decorators: [
    (Story) => (
      <div className="h-24 w-24">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UserAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: '다빈치',
  },
};

// name으로 아바타가 결정되므로 같은 이름은 어디서든 같은 모양이다
export const ByName: Story = {
  args: { name: '다빈치' },
  decorators: [
    (Story) => (
      <div className="w-auto">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="flex gap-4">
      {['다빈치', '피카소', '고흐', '모네'].map((name) => (
        <div key={name} className="flex flex-col items-center gap-1">
          <UserAvatar name={name} size="64px" />
          <span className="font-handwriting">{name}</span>
        </div>
      ))}
    </div>
  ),
};
