import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { fn } from 'storybook/test';
import BaseModal from './BaseModal';

const meta = {
  title: 'shared/ui/BaseModal',
  component: BaseModal,
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
  },
} satisfies Meta<typeof BaseModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: '게임 설명서',
    message:
      '1. 제시된 그림을 잘 기억하세요\n2. 기억한 그림을 그려주세요\n3. 유사도가 높을수록 점수가 높아요!',
  },
};

export const WithCancel: Story = {
  args: {
    title: '게임을 나가시겠습니까?',
    message: '진행 중인 게임에서 퇴장합니다.',
    confirmText: '나가기',
    showCancel: true,
  },
};

export const ConfirmDisabled: Story = {
  args: {
    title: '닉네임 설정',
    message: '닉네임을 입력해야 시작할 수 있어요.',
    confirmDisabled: true,
  },
};

export const DefaultVariant: Story = {
  args: {
    title: '알림',
    message: '손그림 테두리 없는 기본 모달입니다.',
    variant: 'default',
    buttonVariant: 'default',
    showCancel: true,
  },
};

export const WithChildren: Story = {
  args: {
    title: '프로필',
    children: (
      <div className="font-handwriting rounded-xl bg-gray-100 p-4 text-center text-xl">
        children 영역에 원하는 콘텐츠를 넣을 수 있어요
      </div>
    ),
  },
};
