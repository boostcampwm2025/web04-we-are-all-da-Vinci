import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { MemoryRouter } from 'react-router-dom';
import OverlayModal from './OverlayModal';

const meta = {
  title: 'shared/ui/OverlayModal',
  component: OverlayModal,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: {
    isOpen: true,
    onClose: fn(),
    onConfirm: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof OverlayModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: '알림',
    message: '기본 알림 메시지입니다.',
  },
};

export const WithMessage: Story = {
  args: {
    title: '게임 설명서',
    message:
      '1. 제시된 그림을 잘 기억하세요\n2. 기억한 그림을 그려주세요\n3. 유사도가 높을수록 점수가 높아요!',
  },
};

export const ConfirmOnly: Story = {
  args: {
    title: '오류',
    message: '방 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    onCancel: undefined,
  },
};

export const ConfirmAndCancel: Story = {
  args: {
    title: '홍길동님을 퇴장시키겠습니까?',
    confirmText: '퇴장',
    cancelText: '취소',
  },
};

export const CustomButtonText: Story = {
  args: {
    title: '게임을 종료하시겠습니까?',
    message: '진행 중인 게임 데이터가 저장되지 않습니다.',
    confirmText: '종료',
    cancelText: '계속하기',
  },
};
