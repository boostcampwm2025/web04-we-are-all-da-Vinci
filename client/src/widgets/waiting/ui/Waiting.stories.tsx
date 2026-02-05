import { initialState, useGameStore } from '@/entities/gameRoom';
import { createMockPlayers, MOCK_SETTINGS } from '@/test/mocks/mockData';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { Waiting } from './Waiting';

interface StoryArgs {
  playerCount: number;
  maxPlayer: number;
  isInWaitlist: boolean;
  isHost: boolean;
}

const meta: Meta<StoryArgs> = {
  title: 'Widgets/Waiting',
  component: Waiting,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    playerCount: {
      control: { type: 'range', min: 1, max: 30, step: 1 },
      description: '현재 입장한 플레이어 수',
    },
    maxPlayer: {
      control: { type: 'select' },
      options: [2, 4, 6, 8, 10, 20, 100],
      description: '최대 인원 수',
    },
    isInWaitlist: {
      control: { type: 'boolean' },
      description: '대기열에 있는지 여부',
    },
    isHost: {
      control: { type: 'boolean' },
      description: '방장 여부 (잠금/해제 기능 활성화)',
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: (args) => {
    const players = createMockPlayers(args.playerCount);

    useGameStore.setState({
      ...initialState,
      isConnected: true,
      phase: 'WAITING',
      players,
      settings: {
        ...MOCK_SETTINGS,
        maxPlayer: args.maxPlayer,
      },
      roomId: 'ABC123',
      isInWaitlist: args.isInWaitlist,
      mySocketId: args.isHost ? players[0]?.socketId : 'spectator-socket',
    });
    return <Waiting />;
  },
};

export default meta;
type Story = StoryObj<StoryArgs>;

// 기본 상태 - 4명 방에 2명 입장
export const Default: Story = {
  args: {
    playerCount: 2,
    maxPlayer: 4,
    isHost: true,
    isInWaitlist: false,
  },
};

// 8명 방 - 잠금/해제 기능 사용 가능
export const EightPlayersWithLock: Story = {
  args: {
    playerCount: 4,
    maxPlayer: 8,
    isHost: true,
    isInWaitlist: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          '8명 이하 방에서는 방장이 빈자리를 클릭하여 슬롯을 잠그거나, 잠금 슬롯을 클릭하여 해제할 수 있습니다.',
      },
    },
  },
};

// 인원 제한 - 5명 설정
export const FivePlayersLimit: Story = {
  args: {
    playerCount: 3,
    maxPlayer: 5,
    isHost: true,
    isInWaitlist: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'maxPlayer를 5로 설정하여 5명 이후 슬롯이 잠깁니다.',
      },
    },
  },
};

// 10명 방 - 잠금 기능 비활성화
export const TenPlayersNoLock: Story = {
  args: {
    playerCount: 6,
    maxPlayer: 10,
    isHost: true,
    isInWaitlist: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          '8명 초과 인원에서는 잠금/해제 기능이 비활성화됩니다. 슬롯 목록이 스크롤 가능합니다.',
      },
    },
  },
};

// 20명 대규모 방
export const TwentyPlayersEvent: Story = {
  args: {
    playerCount: 12,
    maxPlayer: 20,
    isHost: true,
    isInWaitlist: false,
  },
  parameters: {
    docs: {
      description: {
        story: '이벤트성 대규모 방. 8명 초과 시 스크롤이 발생합니다.',
      },
    },
  },
};

// 100명 이벤트 방
export const HundredPlayersEvent: Story = {
  args: {
    playerCount: 15,
    maxPlayer: 100,
    isHost: true,
    isInWaitlist: false,
  },
};

// 대기열에 있는 경우
export const InWaitlist: Story = {
  args: {
    playerCount: 4,
    maxPlayer: 4,
    isHost: false,
    isInWaitlist: true,
  },
  parameters: {
    docs: {
      description: {
        story: '방이 꽉 차서 대기열에 있는 상태입니다.',
      },
    },
  },
};

// 방장이 아닌 경우
export const NonHostView: Story = {
  args: {
    playerCount: 4,
    maxPlayer: 8,
    isHost: false,
    isInWaitlist: false,
  },
  parameters: {
    docs: {
      description: {
        story: '방장이 아닌 경우 슬롯 잠금/해제 기능이 비활성화됩니다.',
      },
    },
  },
};

// 만원 상태
export const FullRoom: Story = {
  args: {
    playerCount: 8,
    maxPlayer: 8,
    isHost: true,
    isInWaitlist: false,
  },
};

// 빈방 (방장만)
export const EmptyRoomHostOnly: Story = {
  args: {
    playerCount: 1,
    maxPlayer: 8,
    isHost: true,
    isInWaitlist: false,
  },
  parameters: {
    docs: {
      description: {
        story: '방장만 있는 상태입니다. 다른 플레이어 입장을 대기 중입니다.',
      },
    },
  },
};
