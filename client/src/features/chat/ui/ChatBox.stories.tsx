import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { MemoryRouter } from 'react-router-dom';
import ChatBox from './ChatBox';
import type { ChatMessage } from '../model/types';

const SAMPLE_MESSAGES: ChatMessage[] = [
  {
    type: 'system',
    message: '채팅방에 입장하셨습니다.',
    timestamp: Date.now() - 100000,
  },
  {
    type: 'user',
    nickname: 'Player1',
    profileId: 'profile-1',
    message: '안녕하세요!',
    timestamp: Date.now() - 90000,
    socketId: 'socket-1',
  },
  {
    type: 'user',
    nickname: 'Player2',
    profileId: 'profile-2',
    message: '반갑습니다~ 게임 시작할까요?',
    timestamp: Date.now() - 80000,
    socketId: 'socket-2',
  },
  {
    type: 'system',
    message: '새로운 플레이어가 입장했습니다.',
    timestamp: Date.now() - 70000,
    systemType: 'join',
  },
  {
    type: 'user',
    nickname: 'Player3',
    profileId: 'profile-3',
    message: '저도 참여합니다!',
    timestamp: Date.now() - 60000,
    socketId: 'socket-3',
  },
];

const meta = {
  title: 'features/chat/ChatBox',
  component: ChatBox,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div style={{ width: '320px', height: '480px' }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  args: {
    onSendMessage: fn(),
  },
} satisfies Meta<typeof ChatBox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    messages: SAMPLE_MESSAGES,
  },
};

export const Empty: Story = {
  args: {
    messages: [],
  },
};

export const CustomTitle: Story = {
  args: {
    messages: SAMPLE_MESSAGES,
  },
};

export const ManyMessages: Story = {
  args: {
    messages: [
      ...SAMPLE_MESSAGES,
      ...SAMPLE_MESSAGES.map((msg, idx) => ({
        ...msg,
        timestamp: msg.timestamp + idx * 1000,
      })),
    ],
  },
};
