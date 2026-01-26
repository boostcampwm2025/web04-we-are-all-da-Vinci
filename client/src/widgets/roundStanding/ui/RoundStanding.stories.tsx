import type { Meta, StoryObj } from '@storybook/react-vite';
import { RoundStanding } from './RoundStanding';
import { withMockGameStore, createMockStandingResults } from '@/test/mocks/mockGameStore';

const meta = {
  title: 'Widgets/RoundStanding',
  component: RoundStanding,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    withMockGameStore({
      phase: 'ROUND_STANDING',
      currentRound: 1,
      timer: 10,
      standingResults: createMockStandingResults(4),
      previousStandingResults: [],
    }),
  ],
} satisfies Meta<typeof RoundStanding>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 기본 순위 화면
 * - 1라운드 후 누적 순위
 * - 4명의 플레이어
 */
export const Default: Story = {};

/**
 * 30명의 플레이어 순위 (스크롤 테스트용)
 * - 이전 라운드(900점 기준) → 현재 라운드(1000점 기준)로 점수 증가
 * - 순서 변경으로 FLIP 애니메이션 확인
 */
export const ManyPlayers: Story = {
  decorators: [
    withMockGameStore({
      phase: 'ROUND_STANDING',
      currentRound: 3,
      timer: 10,
      standingResults: createMockStandingResults(30, 1000),
      previousStandingResults: createMockStandingResults(30, 900).reverse(),
    }),
  ],
};
