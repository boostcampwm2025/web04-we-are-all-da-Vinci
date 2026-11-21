import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import Toast from './Toast';

const meta = {
  title: 'shared/ui/Toast',
  component: Toast,
  argTypes: {
    type: { control: 'inline-radio', options: ['success', 'error', 'info'] },
  },
  args: {
    onClose: fn(),
    // 스토리에서는 자동 닫힘(onClose 호출)이 화면을 바꾸지 않으므로 기본값을 유지한다
    duration: 2000,
  },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: { type: 'success', message: '방 코드가 복사되었어요!' },
};

export const ErrorType: Story = {
  name: 'Error',
  args: { type: 'error', message: '방을 찾을 수 없어요.' },
};

export const Info: Story = {
  args: { type: 'info', message: '곧 게임이 시작됩니다.' },
};
