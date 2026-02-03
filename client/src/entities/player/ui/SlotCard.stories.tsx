import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SlotCard } from './SlotCard';

const meta = {
  title: 'entities/player/슬롯 카드 (SlotCard)',
  component: SlotCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '플레이어 목록에서 빈자리와 잠금 슬롯을 표시하는 컴포넌트입니다. 방장은 빈자리를 클릭하여 슬롯을 잠그거나, 잠금 슬롯을 클릭하여 해제할 수 있습니다.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="h-40 w-32">
        <Story />
      </div>
    ),
  ],
  args: {
    onClick: fn(),
    onMouseEnter: fn(),
    onMouseLeave: fn(),
  },
} satisfies Meta<typeof SlotCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyDefault: Story = {
  name: '빈자리 - 기본 상태',
  args: {
    variant: 'empty',
    isInteractive: false,
    isHighlighted: false,
  },
};

export const EmptyHighlighted: Story = {
  name: '빈자리 - 호버 (주황색)',
  args: {
    variant: 'empty',
    isInteractive: true,
    isHighlighted: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          '방장이 빈자리에 마우스를 올리면 주황색으로 하이라이트되며 "클릭하여 잠금" 표시',
      },
    },
  },
};

export const EmptyInteractive: Story = {
  name: '빈자리 - 클릭 가능 (방장)',
  args: {
    variant: 'empty',
    isInteractive: true,
    isHighlighted: false,
  },
};

export const LockedDefault: Story = {
  name: '잠금 - 기본 상태',
  args: {
    variant: 'locked',
    isInteractive: false,
    isHighlighted: false,
  },
};

export const LockedHighlighted: Story = {
  name: '잠금 - 호버 (초록색)',
  args: {
    variant: 'locked',
    isInteractive: true,
    isHighlighted: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          '방장이 잠금 슬롯에 마우스를 올리면 초록색으로 하이라이트되며 "클릭하여 해제" 표시',
      },
    },
  },
};

export const LockedInteractive: Story = {
  name: '잠금 - 클릭 가능 (방장)',
  args: {
    variant: 'locked',
    isInteractive: true,
    isHighlighted: false,
  },
};

export const UnlockScenario: Story = {
  name: '시나리오: 잠금 해제',
  args: {
    variant: 'locked',
  },
  render: () => (
    <div className="flex gap-2">
      <div className="h-40 w-32">
        <SlotCard variant="locked" isInteractive={true} isHighlighted={false} />
      </div>
      <div className="h-40 w-32">
        <SlotCard variant="locked" isInteractive={true} isHighlighted={true} />
      </div>
      <div className="h-40 w-32">
        <SlotCard variant="locked" isInteractive={true} isHighlighted={true} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '잠금 슬롯을 호버하면 해당 슬롯부터 maxPlayer까지 초록색으로 하이라이트됩니다.',
      },
    },
  },
};

export const LockScenario: Story = {
  name: '시나리오: 잠금 설정',
  args: {
    variant: 'empty',
  },
  render: () => (
    <div className="flex gap-2">
      <div className="h-40 w-32">
        <SlotCard variant="empty" isInteractive={true} isHighlighted={false} />
      </div>
      <div className="h-40 w-32">
        <SlotCard variant="empty" isInteractive={true} isHighlighted={true} />
      </div>
      <div className="h-40 w-32">
        <SlotCard variant="empty" isInteractive={true} isHighlighted={true} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '빈자리 슬롯을 호버하면 해당 슬롯부터 끝까지 주황색으로 하이라이트됩니다.',
      },
    },
  },
};

export const DisabledSlots: Story = {
  name: '8명 초과 - 비활성화',
  args: {
    variant: 'empty',
  },
  render: () => (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-sm font-bold">8명 이하 (상호작용 가능)</p>
        <div className="flex gap-2">
          <div className="h-40 w-32">
            <SlotCard
              variant="empty"
              isInteractive={true}
              isHighlighted={false}
            />
          </div>
          <div className="h-40 w-32">
            <SlotCard
              variant="locked"
              isInteractive={true}
              isHighlighted={false}
            />
          </div>
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-bold">
          10명/20명/100명 (상호작용 불가)
        </p>
        <div className="flex gap-2">
          <div className="h-40 w-32">
            <SlotCard
              variant="empty"
              isInteractive={false}
              isHighlighted={false}
            />
          </div>
          <div className="h-40 w-32">
            <SlotCard
              variant="locked"
              isInteractive={false}
              isHighlighted={false}
            />
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '8명 초과 인원에서는 잠금/해제 기능이 비활성화되어 cursor-not-allowed가 표시됩니다.',
      },
    },
  },
};
