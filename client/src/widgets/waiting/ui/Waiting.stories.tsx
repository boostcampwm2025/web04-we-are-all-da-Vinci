import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { Waiting } from './Waiting';
import { withMockGameStore, createMockPlayers, MOCK_SETTINGS } from '@/test/mocks/mockGameStore';

const meta = {
  title: 'Widgets/Waiting',
  component: Waiting,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    withMockGameStore({
      phase: 'WAITING',
      players: createMockPlayers(4),
      settings: MOCK_SETTINGS,
      roomId: 'ABC123',
    }),
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof Waiting>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 기본 대기실 화면
 * - 4명의 플레이어가 입장한 상태
 * - 호스트 시점 (방장 버튼 표시)
 */
export const Default: Story = {};

/**
 * 최대 인원이 찬 대기실
 * - 8명의 플레이어가 입장한 상태
 */
export const FullRoom: Story = {
  decorators: [
    withMockGameStore({
      phase: 'WAITING',
      players: createMockPlayers(8),
      settings: MOCK_SETTINGS,
      roomId: 'FULL88',
    }),
  ],
};
