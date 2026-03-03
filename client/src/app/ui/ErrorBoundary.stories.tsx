import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';

/** 렌더링 중 에러를 강제로 발생시키는 헬퍼 컴포넌트 */
const ThrowOnRender = () => {
  throw new Error('스토리 에러 시뮬레이션');
};

const meta = {
  title: 'app/ui/ErrorBoundary',
  component: ErrorBoundary,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div style={{ height: '100vh' }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 렌더링 오류 발생 시 fallback UI
 * - "오류가 발생했습니다." 안내 메시지
 * - 다시 시도 버튼 (error state 초기화)
 * - 홈으로 이동 버튼
 */
export const ErrorState: Story = {
  args: {
    children: <ThrowOnRender />,
  },
};
