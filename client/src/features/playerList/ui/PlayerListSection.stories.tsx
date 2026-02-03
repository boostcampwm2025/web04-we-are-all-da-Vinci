import { initialState, useGameStore } from '@/entities/gameRoom';
import type { Player } from '@/entities/player/model';
import { createMockPlayers } from '@/test/mocks/mockData';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { MemoryRouter } from 'react-router-dom';
import { PlayerListSection } from './PlayerListSection';

interface StoryArgs {
  playerCount: number;
  maxPlayer: number;
  isHost: boolean;
}

const meta: Meta<StoryArgs> = {
  title: 'features/playerList/PlayerListSection',
  component: PlayerListSection,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    playerCount: {
      control: { type: 'range', min: 0, max: 20, step: 1 },
      description: '현재 입장한 플레이어 수',
    },
    maxPlayer: {
      control: { type: 'select' },
      options: [2, 4, 6, 8, 10, 20, 100],
      description: '최대 인원 수',
    },
    isHost: {
      control: { type: 'boolean' },
      description: '방장 여부 (잠금/해제 버튼 활성화)',
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="flex h-screen items-center justify-center bg-surface-default p-4">
          <div className="h-[600px] w-full max-w-md">
            <Story />
          </div>
        </div>
      </MemoryRouter>
    ),
  ],
  render: (args) => {
    const players = createMockPlayers(args.playerCount);

    // 현재 사용자를 플레이어에 추가 (방장 여부 설정)
    useGameStore.setState({
      ...initialState,
      players,
      settings: {
        drawingTime: 90,
        totalRounds: 5,
        maxPlayer: args.maxPlayer,
      },
      roomId: 'TEST123',
      mySocketId: args.isHost ? players[0]?.socketId : 'spectator-socket',
    });

    return (
      <PlayerListSection
        players={players}
        maxPlayer={args.maxPlayer}
        roomCode={
          <button
            className="rounded bg-interactive-default px-3 py-1 text-sm text-white"
            onClick={fn()}
          >
            복사
          </button>
        }
      />
    );
  },
};

export default meta;
type Story = StoryObj<StoryArgs>;

// 기본 상태 - 4명 방, 2명 입장
export const Default: Story = {
  args: {
    playerCount: 2,
    maxPlayer: 4,
    isHost: true,
  },
};

// 8명 기본 슬롯 - 빈자리 많음
export const EightSlotsEmpty: Story = {
  args: {
    playerCount: 2,
    maxPlayer: 8,
    isHost: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          '8명 이하에서는 방장이 빈자리를 클릭하여 잠금하거나, 잠금 슬롯을 클릭하여 해제할 수 있습니다.',
      },
    },
  },
};

// 8명 기본 슬롯 - 거의 찬 상태
export const EightSlotsAlmostFull: Story = {
  args: {
    playerCount: 6,
    maxPlayer: 8,
    isHost: true,
  },
};

// 잠금 슬롯 포함 (5명 제한)
export const WithLockedSlots: Story = {
  args: {
    playerCount: 3,
    maxPlayer: 5,
    isHost: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'maxPlayer=5로 설정하면 5번 이후 슬롯이 잠금됩니다. 방장은 잠금 슬롯을 클릭하여 인원을 늘릴 수 있습니다.',
      },
    },
  },
};

// 최소 인원 (2명)
export const MinimumPlayers: Story = {
  args: {
    playerCount: 1,
    maxPlayer: 2,
    isHost: true,
  },
};

// 10명 방 - 잠금 기능 비활성화
export const TenPlayersNoLock: Story = {
  args: {
    playerCount: 5,
    maxPlayer: 10,
    isHost: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          '8명 초과 인원에서는 UI 깨짐 방지를 위해 잠금/해제 기능이 비활성화됩니다.',
      },
    },
  },
};

// 20명 방 - 스크롤 발생
export const TwentyPlayersWithScroll: Story = {
  args: {
    playerCount: 12,
    maxPlayer: 20,
    isHost: true,
  },
  parameters: {
    docs: {
      description: {
        story: '8명 초과 시 auto-rows-min이 적용되어 스크롤이 발생합니다.',
      },
    },
  },
};

// 100명 이벤트 방
export const HundredPlayersEvent: Story = {
  args: {
    playerCount: 8,
    maxPlayer: 100,
    isHost: true,
  },
  parameters: {
    docs: {
      description: {
        story: '이벤트성 대규모 방입니다. 스크롤로 모든 슬롯을 확인할 수 있습니다.',
      },
    },
  },
};

// 방장 아닌 경우 - 상호작용 불가
export const NonHostView: Story = {
  args: {
    playerCount: 3,
    maxPlayer: 6,
    isHost: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          '방장이 아닌 경우 슬롯을 클릭하거나 호버해도 아무 동작이 일어나지 않습니다.',
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
  },
  parameters: {
    docs: {
      description: {
        story: '모든 슬롯이 플레이어로 채워진 상태입니다.',
      },
    },
  },
};

// 빈방 (방장만)
export const EmptyRoomHostOnly: Story = {
  args: {
    playerCount: 1,
    maxPlayer: 8,
    isHost: true,
  },
  parameters: {
    docs: {
      description: {
        story: '방장만 있는 빈방 상태입니다.',
      },
    },
  },
};

// 다양한 maxPlayer 비교
export const CompareMaxPlayerSettings: Story = {
  render: () => {
    const players = createMockPlayers(3);
    useGameStore.setState({
      ...initialState,
      players,
      roomId: 'TEST123',
      mySocketId: players[0]?.socketId,
    });

    return (
      <div className="grid gap-4">
        <div>
          <h3 className="mb-2 text-sm font-bold">maxPlayer: 4 (잠금 가능)</h3>
          <div className="h-[400px]">
            <PlayerListSection players={players} maxPlayer={4} />
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-bold">maxPlayer: 6 (잠금 가능)</h3>
          <div className="h-[400px]">
            <PlayerListSection players={players} maxPlayer={6} />
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-bold">maxPlayer: 10 (잠금 불가)</h3>
          <div className="h-[400px]">
            <PlayerListSection players={players} maxPlayer={10} />
          </div>
        </div>
      </div>
    );
  },
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story: '같은 플레이어 수(3명)에서 maxPlayer 설정에 따른 UI 차이 비교',
      },
    },
  },
};
