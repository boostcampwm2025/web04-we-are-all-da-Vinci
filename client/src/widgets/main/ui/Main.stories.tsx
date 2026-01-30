import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { Main } from './Main';

const meta = {
  title: 'Widgets/Main',
  component: Main,
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
} satisfies Meta<typeof Main>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 기본 메인 화면
 * - 방 만들기, 프로필 설정 버튼
 * - 게임 설명서 링크
 */
export const Default: Story = {};
