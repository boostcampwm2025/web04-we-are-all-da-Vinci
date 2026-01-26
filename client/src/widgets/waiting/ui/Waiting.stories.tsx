import type { Meta, StoryObj } from '@storybook/react-vite';
import { Waiting } from './Waiting';
import { useGameStore } from '@/entities/gameRoom/model';
import { useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';

const meta = {
  title: 'widgets/Waiting',
  component: Waiting,
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
} satisfies Meta<typeof Waiting>;

export default meta;
type Story = StoryObj<typeof meta>;

// 기본 대기방 (플레이어)
export const Default: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        useGameStore.setState({
          roomId: 'ROOM1234',
          players: [
            {
              socketId: '1',
              nickname: '플레이어1',
              profileId: '1',
              isHost: true,
            },
            {
              socketId: '2',
              nickname: '나 (참여자)',
              profileId: '2',
              isHost: false,
            },
          ],
          isInWaitlist: false,
          isPracticing: false,
        });
      }, []);
      return <Story />;
    },
  ],
};

// 방장 상태
export const Host: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        useGameStore.setState({
          roomId: 'HOST8888',
          players: [
            {
              socketId: 'socket-id',
              nickname: '나 (방장)',
              profileId: '3',
              isHost: true,
            },
          ],
          isInWaitlist: false,
          isPracticing: false,
        });
      }, []);
      return <Story />;
    },
  ],
};

// 중도 참여 대기 중 (오버레이 표시)
export const Waitlist: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        useGameStore.setState({
          roomId: 'GAME5678',
          players: [
            {
              socketId: '1',
              nickname: '게임중인유저1',
              profileId: '1',
              isHost: true,
            },
            {
              socketId: '2',
              nickname: '게임중인유저2',
              profileId: '2',
              isHost: false,
            },
          ],
          isInWaitlist: true,
          isPracticing: false,
          gameProgress: { currentRound: 2, totalRounds: 5 },
        });
      }, []);
      return <Story />;
    },
  ],
};
